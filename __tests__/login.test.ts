import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { base64Decode, base64Encode } from '@bufbuild/protobuf/wire';
import { AuthenticateRequestSchema, CreateApiKeyResponseSchema } from '@icco/etu-proto';
import { createNativeGrpcTransport } from '../src/api/nativeGrpc';
import { getTransport } from '../src/api/transport';
import { createLoginSession } from '../src/api/login';

jest.mock('@icco/etu-proto', () => jest.requireActual<typeof import('@icco/etu-proto')>('../node_modules/@icco/etu-proto/dist/etu_pb.js'));
jest.mock('../src/api/transport');

it.each(['etu_test', ''])('calls Login and validates raw key %j', async rawKey => {
  const response = create(CreateApiKeyResponseSchema, { rawKey, apiKey: { id: 'key-id' } });
  const bridge = { unary: jest.fn<Promise<string>, [string, string, string, string, Record<string, string>, number]>().mockResolvedValue(base64Encode(toBinary(CreateApiKeyResponseSchema, response))), cancel: jest.fn() };
  jest.mocked(getTransport).mockReturnValue(createNativeGrpcTransport('https://grpc.example.com', bridge));
  const login = createLoginSession('test@example.com', 'password');
  if (rawKey) await expect(login).resolves.toEqual(response);
  else await expect(login).rejects.toThrow('Login response missing session');
  expect(bridge.unary).toHaveBeenCalledWith(expect.any(String), 'https://grpc.example.com',
    'etu.AuthService/Login', expect.any(String), {}, 30000);
  const payload = bridge.unary.mock.calls[0][3];
  expect(fromBinary(AuthenticateRequestSchema, base64Decode(payload))).toMatchObject({ email: 'test@example.com', password: 'password' });
});
