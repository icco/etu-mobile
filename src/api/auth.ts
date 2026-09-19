import * as Keychain from 'react-native-keychain';
import { fromJson, toJson, type JsonValue } from '@bufbuild/protobuf';
import { UserSchema } from '@icco/etu-proto';
import { createLoginSession } from './login';
import {
  authClient,
  apiKeysClient,
  createHeaders,
} from './client';
import type { User } from './client';
import { logError, logWarning, logInfo, logException } from '../utils/logger';

const AUTH_KEY = 'etu_auth';
const USER_KEY = 'etu_user';

export interface StoredAuth {
  token: string;
  user: User;
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: AUTH_KEY });
    if (!creds || !creds.password) {
      return null;
    }
    const userJson = await Keychain.getGenericPassword({ service: USER_KEY });
    if (!userJson || !userJson.password) {
      logWarning('Auth token found but user data missing');
      return null;
    }
    const saved = JSON.parse(userJson.password) as User | { version: 1; user: JsonValue };
    // Keep existing sessions readable; new sessions use protobuf JSON for int64 timestamps.
    const user = 'version' in saved && saved.version === 1 ? fromJson(UserSchema, saved.user) : saved as User;
    return { token: creds.password, user };
  } catch (error) {
    logError('Failed to retrieve stored auth', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setStoredAuth(token: string, user: User): Promise<void> {
  try {
    const userJson = JSON.stringify({ version: 1, user: toJson(UserSchema, user) });
    await Keychain.setGenericPassword('etu_user', userJson, {
      service: USER_KEY,
    });
    await Keychain.setGenericPassword('etu', token, { service: AUTH_KEY });
    logInfo('Auth credentials stored successfully');
  } catch (error) {
    logError('Failed to store auth credentials', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function clearStoredAuth(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service: AUTH_KEY });
    await Keychain.resetGenericPassword({ service: USER_KEY });
    logInfo('Auth credentials cleared successfully');
  } catch (error) {
    logError('Failed to clear auth credentials', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function loginWithApiKey(apiKey: string): Promise<User> {
  try {
    const res = await apiKeysClient.client.verifyApiKey(
      { rawKey: apiKey },
      { headers: createHeaders(apiKey) }
    );
    if (!res.valid || !res.userId) {
      logWarning('API key verification failed');
      throw new Error('Invalid API key');
    }
    const userRes = await authClient.client.getUser(
      { userId: res.userId },
      { headers: createHeaders(apiKey) }
    );
    if (!userRes.user) {
      logError('User not found for verified API key', { userId: res.userId });
      throw new Error('User not found');
    }
    const user = userRes.user;
    await setStoredAuth(apiKey, user);
    logInfo('Successfully logged in with API key', { userId: user.id });
    return user;
  } catch (error) {
    logException(error instanceof Error ? error : new Error(String(error)), {
      method: 'loginWithApiKey',
    });
    throw error;
  }
}

/**
 * Hash an email for log correlation without leaking the address itself.
 * djb2 is fast, dependency-free, and good enough to dedupe events without
 * revealing the underlying PII in crash reports or device log streams.
 */
function hashEmail(email: string): string {
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 33) ^ email.charCodeAt(i);
  }
  // Force unsigned and base36 for compactness.
  return (hash >>> 0).toString(36);
}

export async function register(email: string, password: string): Promise<User> {
  try {
    const res = await authClient.client.register(
      { email, password },
      {} // no auth required for register
    );
    if (!res.user) {
      logError('Registration response missing user data');
      throw new Error('Registration failed');
    }
    const user = res.user;
    logInfo('User registered successfully', { userId: user.id });
    // Backend may return a token in future; for now user must create API key in web and use "Login with API key"
    return user;
  } catch (error) {
    logException(error instanceof Error ? error : new Error(String(error)), {
      method: 'register',
      emailHash: hashEmail(email),
    });
    throw error;
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  try {
    const token = await createLoginSession(email, password);
    const user = await loginWithApiKey(token);
    logInfo('Authentication successful', { userId: user.id });
    return user;
  } catch (error) {
    logException(error instanceof Error ? error : new Error(String(error)), {
      method: 'loginWithEmailPassword',
      emailHash: hashEmail(email),
    });
    throw error;
  }
}

export function getAuthHeaders(token: string): Record<string, string> {
  return createHeaders(token);
}
