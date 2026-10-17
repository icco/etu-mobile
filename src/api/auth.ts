import * as Keychain from 'react-native-keychain';
import { fromJson, toJson, type JsonValue } from '@bufbuild/protobuf';
import { UserSchema, CreateApiKeyResponseSchema } from '@icco/etu-proto';
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
const SESSION_USER = 'etu_session';
type Session = { token: string; user?: JsonValue; email?: string; login?: JsonValue; keyId?: string };
// Retain an issued key if the first secure-storage write fails; retry that write
// before another Login RPC. Persisted pending sessions also survive restarts.
let pendingSession: Session | undefined;

async function storeSession(session: Session): Promise<void> {
  await Keychain.setGenericPassword(SESSION_USER, JSON.stringify(session), { service: AUTH_KEY });
}

export interface StoredAuth {
  token: string;
  user: User;
  keyId?: string;
}

function sessionKeyId(session: Session): string | undefined {
  if (session.keyId) return session.keyId;
  if (!session.login) return undefined;
  return fromJson(CreateApiKeyResponseSchema, session.login).apiKey?.id || undefined;
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: AUTH_KEY });
    if (!creds || !creds.password) {
      return null;
    }
    if (creds.username === SESSION_USER) {
      const session = JSON.parse(creds.password) as Session;
      const keyId = sessionKeyId(session);
      if (session.user) return { token: session.token, user: fromJson(UserSchema, session.user), keyId };
      // Finish a previously interrupted login without issuing another key.
      pendingSession = session;
      const user = await loginWithApiKey(session.token);
      return { token: session.token, user, keyId };
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
    const keyId = pendingSession?.token === token ? sessionKeyId(pendingSession) : undefined;
    await storeSession({ token, user: toJson(UserSchema, user), keyId });
    pendingSession = undefined;
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
    pendingSession = undefined;
    logInfo('Auth credentials cleared successfully');
  } catch (error) {
    logError('Failed to clear auth credentials', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function revokeSession(auth: StoredAuth): Promise<boolean> {
  if (!auth.keyId) return false;
  const res = await apiKeysClient.client.deleteApiKey(
    { userId: auth.user.id, keyId: auth.keyId },
    { headers: createHeaders(auth.token) }
  );
  logInfo('Revoked mobile session key', { keyId: auth.keyId, deleted: res.success });
  return res.success;
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
    const saved = await Keychain.getGenericPassword({ service: AUTH_KEY });
    const session = saved && saved.username === SESSION_USER ? JSON.parse(saved.password) as Session : undefined;
    const pending = pendingSession ?? (session && !session.user ? session : undefined);
    if (pending && pending.email !== email) {
      throw new Error('Finish signing in with the previous account before switching accounts');
    }
    if (pending) {
      pendingSession = pending;
    } else {
      const login = await createLoginSession(email, password);
      pendingSession = {
        token: login.rawKey,
        email,
        login: toJson(CreateApiKeyResponseSchema, login),
        keyId: login.apiKey?.id || undefined,
      };
    }
    await storeSession(pendingSession);
    const user = await loginWithApiKey(pendingSession.token);
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
