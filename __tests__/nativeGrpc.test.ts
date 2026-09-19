import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { base64Decode, base64Encode } from '@bufbuild/protobuf/wire';
import { AuthService, AuthenticateRequestSchema, AuthenticateResponseSchema } from '@icco/etu-proto';
import { Code } from '@connectrpc/connect';
import { createNativeGrpcTransport } from '../src/api/nativeGrpc';

jest.mock('@icco/etu-proto', () => jest.requireActual<typeof import('@icco/etu-proto')>('../node_modules/@icco/etu-proto/dist/etu_pb.js'));

const bridge = { unary: jest.fn<Promise<string>, [string, string, string, string, Record<string, string>, number]>(), cancel: jest.fn() };
beforeEach(() => jest.clearAllMocks());

it('sends protobuf bytes, metadata and deadline to native gRPC and decodes the response', async () => {
  bridge.unary.mockResolvedValue(base64Encode(toBinary(AuthenticateResponseSchema,
    create(AuthenticateResponseSchema, { success: true }))));
  const result = await createNativeGrpcTransport('https://grpc.example.com', bridge).unary(
    AuthService.method.authenticate, undefined, 5000, { Authorization: 'etu_key' },
    { email: 'test@example.com', password: 'café 🔐' },
  );
  const [, endpoint, method, payload, metadata, timeout] = bridge.unary.mock.calls[0];
  expect(endpoint).toBe('https://grpc.example.com');
  expect(method).toBe('etu.AuthService/Authenticate');
  expect(fromBinary(AuthenticateRequestSchema, base64Decode(payload)).password).toBe('café 🔐');
  expect(metadata).toEqual({ authorization: 'etu_key' });
  expect(timeout).toBe(5000);
  expect(result.message.success).toBe(true);
});

it.each([Code.Unauthenticated, Code.DeadlineExceeded, Code.Unavailable])('preserves native status %s', async code => {
  bridge.unary.mockRejectedValue({ code: String(code), message: 'RPC failed' });
  await expect(createNativeGrpcTransport('https://grpc.example.com', bridge).unary(
    AuthService.method.authenticate, undefined, undefined, {}, {},
  )).rejects.toMatchObject({ code });
});

it('forwards cancellation to the native call', async () => {
  let rejectCall!: (error: unknown) => void;
  bridge.unary.mockImplementation(() => new Promise((_resolve, reject) => { rejectCall = reject; }));
  const controller = new AbortController();
  const call = createNativeGrpcTransport('https://grpc.example.com', bridge).unary(
    AuthService.method.authenticate, controller.signal, undefined, {}, {},
  );
  controller.abort();
  expect(bridge.cancel).toHaveBeenCalledWith(bridge.unary.mock.calls[0][0]);
  rejectCall({ code: '1', message: 'Cancelled' });
  await expect(call).rejects.toMatchObject({ code: Code.Canceled });
});

it('does not start an already cancelled request', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(createNativeGrpcTransport('https://grpc.example.com', bridge).unary(
    AuthService.method.authenticate, controller.signal, undefined, {}, {},
  )).rejects.toMatchObject({ code: Code.Canceled });
  expect(bridge.unary).not.toHaveBeenCalled();
});
