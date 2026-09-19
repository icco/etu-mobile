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

@interface EtuGrpc : NSObject <RCTBridgeModule>
@property(nonatomic, strong) NSMutableDictionary<NSString *, GRPCCall2 *> *calls;
@end

@implementation EtuGrpc
RCT_EXPORT_MODULE();
+ (BOOL)requiresMainQueueSetup { return NO; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (instancetype)init {
  if ((self = [super init])) _calls = [NSMutableDictionary new];
  return self;
}

RCT_EXPORT_METHOD(unary:(NSString *)callId endpoint:(NSString *)endpoint method:(NSString *)method
                  payload:(NSString *)payload headers:(NSDictionary *)headers timeoutMs:(double)timeoutMs
                  resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  NSURL *url = [NSURL URLWithString:endpoint];
  BOOL tls = [url.scheme isEqualToString:@"https"];
  BOOL local = [@[@"localhost", @"127.0.0.1"] containsObject:url.host];
  if (!url.host || url.user || url.query || (url.path.length && ![url.path isEqualToString:@"/"]) ||
      (!tls && !([url.scheme isEqualToString:@"http"] && local))) {
    reject(@"3", @"Invalid gRPC endpoint", nil);
    return;
  }
  NSData *data = [[NSData alloc] initWithBase64EncodedString:payload options:0];
  if (!data) { reject(@"3", @"Invalid gRPC payload", nil); return; }
  GRPCMutableCallOptions *options = [GRPCMutableCallOptions new];
  options.initialMetadata = headers;
  options.timeout = timeoutMs / 1000.0;
  options.responseSizeLimit = 16 * 1024 * 1024;
  options.retryEnabled = NO;
  if (!tls) options.transportType = GRPCTransportTypeInsecure;
  NSString *host = [NSString stringWithFormat:@"%@:%@", url.host, url.port ?: (tls ? @443 : @80)];
  GRPCRequestOptions *request = [[GRPCRequestOptions alloc] initWithHost:host
    path:[@"/" stringByAppendingString:method] safety:GRPCCallSafetyDefault];
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

RCT_EXPORT_METHOD(cancel:(NSString *)callId) { [self.calls[callId] cancel]; }
- (void)invalidate {
  for (GRPCCall2 *call in self.calls.allValues) [call cancel];
  [self.calls removeAllObjects];
}
@end
