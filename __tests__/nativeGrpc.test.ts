import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { base64Decode, base64Encode } from '@bufbuild/protobuf/wire';
import {
  AccountService, AuthService, AuthenticateRequestSchema, AuthenticateResponseSchema,
  ExportDataRequestSchema, ExportDataResponseSchema, NotesService,
} from '@icco/etu-proto';
import { Code, createClient } from '@connectrpc/connect';
import { createNativeGrpcTransport } from '../src/api/nativeGrpc';

jest.mock('@icco/etu-proto', () => jest.requireActual<typeof import('@icco/etu-proto')>('../node_modules/@icco/etu-proto/dist/etu_pb.js'));

const bridge = {
  unary: jest.fn<Promise<string>, [string, string, string, string, Record<string, string>, number]>(),
  serverStream: jest.fn<Promise<void>, [string, string, string, string, Record<string, string>, number]>(),
  next: jest.fn<Promise<string | null>, [string]>(),
  cancel: jest.fn(),
};
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

const encodeNote = (id: string) => base64Encode(toBinary(ExportDataResponseSchema,
  create(ExportDataResponseSchema, { item: { case: 'note', value: { id } } })));

describe('server streaming', () => {
  const client = () => createClient(AccountService, createNativeGrpcTransport('https://grpc.example.com', bridge));

  it('starts the stream natively and yields messages until the native side ends', async () => {
    bridge.serverStream.mockResolvedValue();
    bridge.next.mockResolvedValueOnce(encodeNote('n1')).mockResolvedValueOnce(encodeNote('n2')).mockResolvedValueOnce(null);
    const ids: string[] = [];
    for await (const res of client().exportData({ userId: 'user-1' }, { headers: { Authorization: 'etu_key' } })) {
      if (res.item.case === 'note') ids.push(res.item.value.id);
    }
    expect(ids).toEqual(['n1', 'n2']);
    const [id, endpoint, method, payload, metadata, timeout] = bridge.serverStream.mock.calls[0];
    expect(endpoint).toBe('https://grpc.example.com');
    expect(method).toBe('etu.AccountService/ExportData');
    expect(fromBinary(ExportDataRequestSchema, base64Decode(payload)).userId).toBe('user-1');
    expect(metadata).toEqual({ authorization: 'etu_key' });
    expect(timeout).toBe(15 * 60 * 1000);
    expect(bridge.next).toHaveBeenCalledWith(id);
    expect(bridge.cancel).not.toHaveBeenCalled();
  });

  it('maps native stream errors to connect codes', async () => {
    bridge.serverStream.mockResolvedValue();
    bridge.next.mockResolvedValueOnce(encodeNote('n1')).mockRejectedValueOnce({ code: '7', message: 'permission denied' });
    const iterate = async () => {
      for await (const _ of client().exportData({ userId: 'user-1' })) { /* drain */ }
    };
    await expect(iterate()).rejects.toMatchObject({ code: Code.PermissionDenied });
    expect(bridge.cancel).not.toHaveBeenCalled();
  });

  it('maps failures to start the stream', async () => {
    bridge.serverStream.mockRejectedValue({ code: '14', message: 'unavailable' });
    const iterate = async () => {
      for await (const _ of client().exportData({ userId: 'user-1' })) { /* drain */ }
    };
    await expect(iterate()).rejects.toMatchObject({ code: Code.Unavailable });
    expect(bridge.next).not.toHaveBeenCalled();
  });

  it('cancels the native call when the consumer stops early', async () => {
    bridge.serverStream.mockResolvedValue();
    bridge.next.mockResolvedValue(encodeNote('n1'));
    const response = await createNativeGrpcTransport('https://grpc.example.com', bridge).stream(
      AccountService.method.exportData, undefined, undefined, {}, (async function* () { yield { userId: 'user-1' }; })(),
    );
    for await (const _ of response.message) break;
    expect(bridge.cancel).toHaveBeenCalledWith(bridge.serverStream.mock.calls[0][0]);
  });

  it('forwards abort signals to the native call', async () => {
    bridge.serverStream.mockResolvedValue();
    let rejectNext!: (error: unknown) => void;
    bridge.next.mockImplementation(() => new Promise((_resolve, reject) => { rejectNext = reject; }));
    const controller = new AbortController();
    const iterate = (async () => {
      for await (const _ of client().exportData({ userId: 'user-1' }, { signal: controller.signal })) { /* drain */ }
    })();
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);
    controller.abort();
    expect(bridge.cancel).toHaveBeenCalledWith(bridge.serverStream.mock.calls[0][0]);
    rejectNext({ code: '1', message: 'Cancelled' });
    await expect(iterate).rejects.toMatchObject({ code: Code.Canceled });
  });

  it('reports a missing native streaming implementation', async () => {
    const legacy = { unary: bridge.unary, cancel: bridge.cancel };
    await expect(createNativeGrpcTransport('https://grpc.example.com', legacy).stream(
      AccountService.method.exportData, undefined, undefined, {}, (async function* () { yield {}; })(),
    )).rejects.toMatchObject({ code: Code.Unavailable });
  });

  it('rejects client and bidi streaming methods', async () => {
    const method = { ...NotesService.method.listNotes, methodKind: 'bidi_streaming' } as unknown as typeof AccountService.method.exportData;
    await expect(createNativeGrpcTransport('https://grpc.example.com', bridge).stream(
      method, undefined, undefined, {}, (async function* () { yield {}; })(),
    )).rejects.toMatchObject({ code: Code.Unimplemented });
  });
});
