import * as Keychain from 'react-native-keychain';
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
    const user = JSON.parse(userJson.password) as User;
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
    await Keychain.setGenericPassword('etu', token, { service: AUTH_KEY });
    await Keychain.setGenericPassword('etu_user', JSON.stringify(user), {
      service: USER_KEY,
    });
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
      email,
    });
    throw error;
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  try {
    const res = await authClient.client.authenticate(
      { email, password },
      {} // no auth required for authenticate
    );
    if (!res.success || !res.user) {
      logWarning('Authentication failed for user', { email });
      throw new Error('Invalid email or password');
    }
    const user = res.user;
    logInfo('Authentication successful', { userId: user.id });
    
    // Backend does not return a token in proto yet; create an API key for this app session
    try {
      const keyRes = await apiKeysClient.client.createApiKey(
        { userId: user.id, name: 'etu-mobile' },
        {} // backend may accept session from authenticate; if not, user must use API key login
      );
      if (keyRes.rawKey) {
        await setStoredAuth(keyRes.rawKey, user);
        logInfo('API key created and stored for session');
        return user;
      }
    } catch (error) {
      // If CreateApiKey requires auth, user must use "Login with API key" from web Settings
      logError('Failed to create API key after authentication', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.id,
      });
    }
    throw new Error(
      'Login succeeded but no session token. Create an API key in Etu web Settings and use "Login with API key".'
    );
  } catch (error) {
    logException(error instanceof Error ? error : new Error(String(error)), {
      method: 'loginWithEmailPassword',
      email,
    });
    throw error;
  }
}

export function getAuthHeaders(token: string): Record<string, string> {
  return createHeaders(token);
}
