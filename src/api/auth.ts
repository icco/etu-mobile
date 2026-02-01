import * as Keychain from 'react-native-keychain';
import {
  authClient,
  apiKeysClient,
  createHeaders,
} from './client';
import type { User } from './client';

const AUTH_KEY = 'etu_auth';
const USER_KEY = 'etu_user';

export interface StoredAuth {
  token: string;
  user: User;
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: AUTH_KEY });
    if (!creds || !creds.password) return null;
    const userJson = await Keychain.getGenericPassword({ service: USER_KEY });
    if (!userJson || !userJson.password) return null;
    const user = JSON.parse(userJson.password) as User;
    return { token: creds.password, user };
  } catch {
    return null;
  }
}

export async function setStoredAuth(token: string, user: User): Promise<void> {
  await Keychain.setGenericPassword('etu', token, { service: AUTH_KEY });
  await Keychain.setGenericPassword('etu_user', JSON.stringify(user), {
    service: USER_KEY,
  });
}

export async function clearStoredAuth(): Promise<void> {
  await Keychain.resetGenericPassword({ service: AUTH_KEY });
  await Keychain.resetGenericPassword({ service: USER_KEY });
}

export async function loginWithApiKey(apiKey: string): Promise<User> {
  const res = await apiKeysClient.client.verifyApiKey(
    { rawKey: apiKey },
    { headers: createHeaders(apiKey) }
  );
  if (!res.valid || !res.userId) {
    throw new Error('Invalid API key');
  }
  const userRes = await authClient.client.getUser(
    { userId: res.userId },
    { headers: createHeaders(apiKey) }
  );
  if (!userRes.user) {
    throw new Error('User not found');
  }
  const user = userRes.user as User;
  await setStoredAuth(apiKey, user);
  return user;
}

export async function register(email: string, password: string): Promise<User> {
  const res = await authClient.client.register(
    { email, password },
    {} // no auth required for register
  );
  if (!res.user) {
    throw new Error('Registration failed');
  }
  const user = res.user as User;
  // Backend may return a token in future; for now user must create API key in web and use "Login with API key"
  return user;
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  const res = await authClient.client.authenticate(
    { email, password },
    {} // no auth required for authenticate
  );
  if (!res.success || !res.user) {
    throw new Error('Invalid email or password');
  }
  const user = res.user as User;
  // Backend does not return a token in proto yet; create an API key for this app session
  try {
    const keyRes = await apiKeysClient.client.createApiKey(
      { userId: user.id, name: 'etu-mobile' },
      {} // backend may accept session from authenticate; if not, user must use API key login
    );
    if (keyRes.rawKey) {
      await setStoredAuth(keyRes.rawKey, user);
      return user;
    }
  } catch {
    // If CreateApiKey requires auth, user must use "Login with API key" from web Settings
  }
  throw new Error(
    'Login succeeded but no session token. Create an API key in Etu web Settings and use "Login with API key".'
  );
}

export function getAuthHeaders(token: string): Record<string, string> {
  return createHeaders(token);
}
