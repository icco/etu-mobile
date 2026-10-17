#import <React/RCTBridgeModule.h>
#import <GRPCClient/GRPCCall.h>

@interface EtuGrpcResponse : NSObject <GRPCResponseHandler>
@property(nonatomic, strong) dispatch_queue_t dispatchQueue;
@property(nonatomic, strong) NSData *message;
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@property(nonatomic, copy) void (^cleanup)(void);
@end

@implementation EtuGrpcResponse
- (void)didReceiveData:(id)data { self.message = data; }
- (void)didCloseWithTrailingMetadata:(NSDictionary *)metadata error:(NSError *)error {
  self.cleanup();
  if (error) self.reject([NSString stringWithFormat:@"%ld", (long)error.code], error.localizedDescription, error);
  else if (!self.message) self.reject(@"13", @"Missing gRPC response", nil);
  else self.resolve([self.message base64EncodedStringWithOptions:0]);
}
@end

@interface EtuGrpcStream : NSObject <GRPCResponseHandler>
@property(nonatomic, strong) dispatch_queue_t dispatchQueue;
@property(nonatomic, strong) GRPCCall2 *call;
@property(nonatomic, strong) NSMutableArray<NSData *> *queue;
@property(nonatomic, copy) RCTPromiseResolveBlock pendingResolve;
@property(nonatomic, copy) RCTPromiseRejectBlock pendingReject;
@property(nonatomic) BOOL closed;
@property(nonatomic, strong) NSError *error;
@property(nonatomic, copy) void (^cleanup)(void);
@end

@implementation EtuGrpcStream
- (instancetype)init {
  if ((self = [super init])) _queue = [NSMutableArray new];
  return self;
}
- (void)settleResolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  self.cleanup();
  self.call = nil;
  if (self.error) reject([NSString stringWithFormat:@"%ld", (long)self.error.code], self.error.localizedDescription, self.error);
  else resolve([NSNull null]);
}
- (void)didReceiveData:(id)data {
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  if (!resolve) { [self.queue addObject:data]; return; }
  self.pendingResolve = nil;
  self.pendingReject = nil;
  resolve([data base64EncodedStringWithOptions:0]);
  [self.call receiveNextMessages:1];
}
- (void)didCloseWithTrailingMetadata:(NSDictionary *)metadata error:(NSError *)error {
  self.closed = YES;
  self.error = error;
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  RCTPromiseRejectBlock reject = self.pendingReject;
  if (!resolve) return;
  self.pendingResolve = nil;
  self.pendingReject = nil;
  [self settleResolve:resolve reject:reject];
}
- (void)nextWithResolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  if (self.queue.count) {
    NSData *data = self.queue.firstObject;
    [self.queue removeObjectAtIndex:0];
    resolve([data base64EncodedStringWithOptions:0]);
    [self.call receiveNextMessages:1];
  } else if (self.closed) {
    [self settleResolve:resolve reject:reject];
  } else {
    self.pendingResolve = resolve;
    self.pendingReject = reject;
  }
}
@end

@interface EtuGrpc : NSObject <RCTBridgeModule>
@property(nonatomic, strong) NSMutableDictionary<NSString *, GRPCCall2 *> *calls;
@property(nonatomic, strong) NSMutableDictionary<NSString *, EtuGrpcStream *> *streams;
@end

@implementation EtuGrpc
RCT_EXPORT_MODULE();
+ (BOOL)requiresMainQueueSetup { return NO; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (instancetype)init {
  if ((self = [super init])) {
    _calls = [NSMutableDictionary new];
    _streams = [NSMutableDictionary new];
  }
  return self;
}

- (GRPCRequestOptions *)requestFor:(NSString *)endpoint method:(NSString *)method {
  NSURL *url = [NSURL URLWithString:endpoint];
  BOOL tls = [url.scheme isEqualToString:@"https"];
  BOOL local = [@[@"localhost", @"127.0.0.1", @"10.0.2.2"] containsObject:url.host];
  if (!url.host || url.user || url.query || (url.path.length && ![url.path isEqualToString:@"/"]) ||
      (!tls && !([url.scheme isEqualToString:@"http"] && local))) {
    return nil;
  }
  NSString *host = [NSString stringWithFormat:@"%@:%@", url.host, url.port ?: (tls ? @443 : @80)];
  return [[GRPCRequestOptions alloc] initWithHost:host
    path:[@"/" stringByAppendingString:method] safety:GRPCCallSafetyDefault];
}

- (GRPCMutableCallOptions *)optionsFor:(NSString *)endpoint headers:(NSDictionary *)headers timeoutMs:(double)timeoutMs {
  GRPCMutableCallOptions *options = [GRPCMutableCallOptions new];
  options.initialMetadata = headers;
  options.timeout = timeoutMs / 1000.0;
  options.responseSizeLimit = 16 * 1024 * 1024;
  options.retryEnabled = NO;
  if (![[NSURL URLWithString:endpoint].scheme isEqualToString:@"https"]) options.transportType = GRPCTransportTypeInsecure;
  return options;
}

RCT_EXPORT_METHOD(unary:(NSString *)callId endpoint:(NSString *)endpoint method:(NSString *)method
                  payload:(NSString *)payload headers:(NSDictionary *)headers timeoutMs:(double)timeoutMs
                  resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  GRPCRequestOptions *request = [self requestFor:endpoint method:method];
  if (!request) { reject(@"3", @"Invalid gRPC endpoint", nil); return; }
  NSData *data = [[NSData alloc] initWithBase64EncodedString:payload options:0];
  if (!data) { reject(@"3", @"Invalid gRPC payload", nil); return; }
  GRPCMutableCallOptions *options = [self optionsFor:endpoint headers:headers timeoutMs:timeoutMs];
  EtuGrpcResponse *handler = [EtuGrpcResponse new];
  handler.dispatchQueue = dispatch_get_main_queue();
  handler.resolve = resolve;
  handler.reject = reject;
  __weak EtuGrpc *weakSelf = self;
  handler.cleanup = ^{ [weakSelf.calls removeObjectForKey:callId]; };
  GRPCCall2 *call = [[GRPCCall2 alloc] initWithRequestOptions:request responseHandler:handler callOptions:options];
  self.calls[callId] = call;
  [call start];
  [call writeData:data];
  [call finish];
}

RCT_EXPORT_METHOD(serverStream:(NSString *)callId endpoint:(NSString *)endpoint method:(NSString *)method
                  payload:(NSString *)payload headers:(NSDictionary *)headers timeoutMs:(double)timeoutMs
                  resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  GRPCRequestOptions *request = [self requestFor:endpoint method:method];
  if (!request) { reject(@"3", @"Invalid gRPC endpoint", nil); return; }
  NSData *data = [[NSData alloc] initWithBase64EncodedString:payload options:0];
  if (!data) { reject(@"3", @"Invalid gRPC payload", nil); return; }
  GRPCMutableCallOptions *options = [self optionsFor:endpoint headers:headers timeoutMs:timeoutMs];
  options.flowControlEnabled = YES;
  EtuGrpcStream *stream = [EtuGrpcStream new];
  stream.dispatchQueue = dispatch_get_main_queue();
  __weak EtuGrpc *weakSelf = self;
  stream.cleanup = ^{ [weakSelf.streams removeObjectForKey:callId]; };
  GRPCCall2 *call = [[GRPCCall2 alloc] initWithRequestOptions:request responseHandler:stream callOptions:options];
  stream.call = call;
  self.streams[callId] = stream;
  [call start];
  [call receiveNextMessages:1];
  [call writeData:data];
  [call finish];
  resolve([NSNull null]);
}

RCT_EXPORT_METHOD(next:(NSString *)callId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  EtuGrpcStream *stream = self.streams[callId];
  if (!stream) { reject(@"5", @"Unknown gRPC stream", nil); return; }
  [stream nextWithResolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(cancel:(NSString *)callId) {
  [self.calls[callId] cancel];
  EtuGrpcStream *stream = self.streams[callId];
  [stream.call cancel];
}
- (void)invalidate {
  for (GRPCCall2 *call in self.calls.allValues) [call cancel];
  [self.calls removeAllObjects];
  for (EtuGrpcStream *stream in self.streams.allValues) [stream.call cancel];
  [self.streams removeAllObjects];
}
@end
