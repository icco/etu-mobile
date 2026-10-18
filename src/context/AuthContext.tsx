import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
} from 'react';
import type { User } from '../api/client';
import {
  getStoredAuth,
  clearStoredAuth,
  loginWithApiKey,
  loginWithEmailPassword,
  register as registerApi,
  revokeSession,
} from '../api/auth';
import { clearQueue } from '../api/offlineQueue';
import { clearCachedData } from '../api/queryClient';
import { logInfo, logError } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

interface AuthState {
  user: User | null;
  token: string | null;
  keyId?: string;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  loginWithKey: (apiKey: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  handleAuthError: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    let cancelled = false;
    void getStoredAuth().then((stored) => {
      if (cancelled) return;
      if (stored) {
        setState({
          user: stored.user,
          token: stored.token,
          keyId: stored.keyId,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((s) => ({ ...s, isLoading: false, isAuthenticated: false }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithKey = useCallback(async (apiKey: string) => {
    const user = await loginWithApiKey(apiKey.trim());
    setState({
      user,
      token: apiKey.trim(),
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await loginWithEmailPassword(email, password);
    const stored = await getStoredAuth();
    setState({
      user,
      token: stored?.token ?? null,
      keyId: stored?.keyId,
      isLoading: false,
      isAuthenticated: !!stored?.token,
    });
  }, []);

  const login = useCallback(
    (email: string, password: string) => signIn(email.trim(), password),
    [signIn],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await registerApi(email.trim(), password);
      try {
        await signIn(email.trim(), password);
      } catch (error) {
        throw new Error(
          `Account created, but signing in failed: ${getErrorMessage(error)}`,
          { cause: error },
        );
      }
    },
    [signIn],
  );

  const clearSession = useCallback(async () => {
    try {
      await clearStoredAuth();
      await clearCachedData();
    } finally {
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const logout = useCallback(async () => {
    const { user, token, keyId } = state;
    if (user && token) {
      try {
        await revokeSession({ user, token, keyId });
      } catch (error) {
        logError('Failed to revoke session on logout', {
          error: getErrorMessage(error),
        });
      }
    }
    await clearSession();
    await clearQueue();
    logInfo('User logged out');
  }, [state, clearSession]);

  const refreshUser = useCallback(async () => {
    const stored = await getStoredAuth();
    if (stored?.user) {
      setState((s) => ({ ...s, user: stored.user }));
    }
  }, []);

  const handleAuthError = useCallback(async () => {
    logError('Authentication error - logging out user');
    await clearSession();
  }, [clearSession]);

  const value: AuthContextValue = {
    ...state,
    loginWithKey,
    login,
    register,
    logout,
    refreshUser,
    handleAuthError,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
