import { create } from '@bufbuild/protobuf';
import { UserSchema } from '@icco/etu-proto';
import * as Keychain from 'react-native-keychain';
import { getStoredAuth, loginWithEmailPassword, setStoredAuth } from '../src/api/auth';
import { createLoginSession } from '../src/api/login';
import { authClient, apiKeysClient } from '../src/api/client';

jest.mock('@icco/etu-proto', () => jest.requireActual<typeof import('@icco/etu-proto')>('../node_modules/@icco/etu-proto/dist/etu_pb.js'));
jest.mock('../src/utils/logger');
jest.mock('../src/api/client', () => ({
  createHeaders: (token: string) => ({ Authorization: token }),
  apiKeysClient: { client: { verifyApiKey: jest.fn() } },
  authClient: { client: { getUser: jest.fn() } },
}));
jest.mock('../src/api/login');

const user = create(UserSchema, {
  id: 'user-1', email: 'test@example.com',
  createdAt: { seconds: 1789830000n, nanos: 123000000 },
});
const store = new Map<string, string>();

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  jest.mocked(createLoginSession).mockResolvedValue('etu_test');
  jest.mocked(apiKeysClient.client.verifyApiKey).mockResolvedValue({ valid: true, userId: user.id } as never);
  jest.mocked(authClient.client.getUser).mockResolvedValue({ user } as never);
  jest.mocked(Keychain.setGenericPassword).mockImplementation((_username, password, options) => {
    store.set(options!.service!, password);
    return Promise.resolve({ service: options!.service!, storage: 'KeystoreAESGCM' as Keychain.STORAGE_TYPE });
  });
  jest.mocked(Keychain.getGenericPassword).mockImplementation((options) => {
    const password = store.get(options!.service!);
    return Promise.resolve(password ? { username: 'etu', password, service: options!.service!, storage: 'KeystoreAESGCM' as Keychain.STORAGE_TYPE } : false);
  });
});

it('exchanges credentials for a session and restores protobuf timestamps after restart', async () => {
  expect(await loginWithEmailPassword('test@example.com', 'password')).toEqual(user);
  expect(createLoginSession).toHaveBeenCalledWith('test@example.com', 'password');
  expect(authClient.client.getUser).toHaveBeenCalledWith({ userId: user.id }, { headers: { Authorization: 'etu_test' } });
  expect(await getStoredAuth()).toEqual({ token: 'etu_test', user });
});

it('stores API-key sessions containing bigint fields without JSON serialization errors', async () => {
  await setStoredAuth('etu_key', user);
  expect(await getStoredAuth()).toEqual({ token: 'etu_key', user });
});

it('keeps legacy stored sessions readable', async () => {
  store.set('etu_auth', 'legacy-key');
  store.set('etu_user', JSON.stringify({ id: 'legacy-user', email: 'test@example.com' }));
  expect(await getStoredAuth()).toEqual({ token: 'legacy-key', user: { id: 'legacy-user', email: 'test@example.com' } });
});

it('does not store a session after failed login', async () => {
  jest.mocked(createLoginSession).mockRejectedValue(new Error('Invalid credentials'));
  await expect(loginWithEmailPassword('test@example.com', 'password')).rejects.toThrow('Invalid credentials');
  expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
});

it('does not persist a session if user retrieval fails', async () => {
  jest.mocked(authClient.client.getUser).mockRejectedValue(new Error('User unavailable'));
  await expect(loginWithEmailPassword('test@example.com', 'password')).rejects.toThrow('User unavailable');
  expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
});
