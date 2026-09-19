import { create, toJson } from '@bufbuild/protobuf';
import { UserSchema } from '@icco/etu-proto';
import * as Keychain from 'react-native-keychain';
import { getStoredAuth, loginWithEmailPassword, setStoredAuth } from '../src/api/auth';

jest.mock('@icco/etu-proto', () => jest.requireActual<typeof import('@icco/etu-proto')>('../node_modules/@icco/etu-proto/dist/etu_pb.js'));
jest.mock('../src/utils/logger');
jest.mock('../src/api/client', () => ({ createHeaders: (token: string) => ({ Authorization: token }) }));
jest.mock('../src/api/transport', () => ({ getMobileApiUrl: () => 'https://example.com/api/mobile' }));

const user = create(UserSchema, {
  id: 'user-1', email: 'test@example.com',
  createdAt: { seconds: 1789830000n, nanos: 123000000 },
});
const store = new Map<string, string>();
const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  globalThis.fetch = fetchMock as typeof fetch;
  jest.mocked(Keychain.setGenericPassword).mockImplementation((_username, password, options) => {
    store.set(options!.service!, password);
    return Promise.resolve({ service: options!.service!, storage: 'KeystoreAESGCM' as Keychain.STORAGE_TYPE });
  });
  jest.mocked(Keychain.getGenericPassword).mockImplementation((options) => {
    const password = store.get(options!.service!);
    return Promise.resolve(password ? { username: 'etu', password, service: options!.service!, storage: 'KeystoreAESGCM' as Keychain.STORAGE_TYPE } : false);
  });
});

afterEach(() => { globalThis.fetch = originalFetch; });

it('exchanges credentials for a session and restores protobuf timestamps after restart', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ token: 'etu_test', user: toJson(UserSchema, user) })));
  expect(await loginWithEmailPassword('test@example.com', 'password')).toEqual(user);
  expect(fetchMock).toHaveBeenCalledWith('https://example.com/api/mobile/login', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
  }));
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

it.each([401, 503])('does not store a session after HTTP %s', async (status) => {
  fetchMock.mockResolvedValue(new Response('{}', { status }));
  await expect(loginWithEmailPassword('test@example.com', 'password')).rejects.toThrow(
    status === 401 ? 'Invalid email or password' : 'Login service unavailable',
  );
  expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
});

it('rejects incomplete session responses', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ user: toJson(UserSchema, user) })));
  await expect(loginWithEmailPassword('test@example.com', 'password')).rejects.toThrow('Login response missing session');
  expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
});
