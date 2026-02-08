import React, {
  createContext,
  useCallback,
  useContext,
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
} from '../api/auth';
import { logInfo, logError } from '../utils/logger';

interface AuthState {
  user: User | null;
  token: string | null;
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

  const login = useCallback(async (email: string, password: string) => {
    const user = await loginWithEmailPassword(email.trim(), password);
    const stored = await getStoredAuth();
    setState({
      user,
      token: stored?.token ?? null,
      isLoading: false,
      isAuthenticated: !!stored?.token,
    });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const user = await registerApi(email.trim(), password);
    const stored = await getStoredAuth();
    setState({
      user,
      token: stored?.token ?? null,
      isLoading: false,
      isAuthenticated: !!stored?.token,
    });
  }, []);

  const logout = useCallback(async () => {
    await clearStoredAuth();
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
    logInfo('User logged out');
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = await getStoredAuth();
    if (stored?.user) {
      setState((s) => ({ ...s, user: stored.user }));
    }
  }, []);

  const handleAuthError = useCallback(async () => {
    logError('Authentication error - logging out user');
    await logout();
  }, [logout]);

  const value: AuthContextValue = {
    ...state,
    loginWithKey,
    login,
    register,
    logout,
    refreshUser,
    handleAuthError,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
