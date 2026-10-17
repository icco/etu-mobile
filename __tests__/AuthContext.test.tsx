/**
 * @format
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueueNote, getPendingNotes } from '../src/api/offlineQueue';
import * as authApi from '../src/api/auth';
import type { User } from '@icco/etu-proto';

import * as logger from '../src/utils/logger';

// Mock the auth API
jest.mock('../src/api/auth');
jest.mock('../src/utils/logger');

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  // Helper to create mock User
  const createMockUser = (id: string, email: string): User => {
    return {
      id,
      email,
      createdAt: undefined,
      $typeName: 'etu.User' as const,
    } as User;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockedAuthApi.getStoredAuth.mockResolvedValue(null);
    mockedAuthApi.clearStoredAuth.mockResolvedValue();
  });

  it('provides auth context', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('loads stored auth on mount', async () => {
    const mockUser = createMockUser('123', 'test@example.com');
    const mockToken = 'test-token';
    mockedAuthApi.getStoredAuth.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login with API key', async () => {
    const mockUser = createMockUser('123', 'test@example.com');
    mockedAuthApi.loginWithApiKey.mockResolvedValue(mockUser);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loginWithKey('test-api-key');
    });

    expect(mockedAuthApi.loginWithApiKey).toHaveBeenCalledWith('test-api-key');
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('test-api-key');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login with email and password', async () => {
    const mockUser = createMockUser('123', 'test@example.com');
    const mockToken = 'generated-token';
    mockedAuthApi.loginWithEmailPassword.mockResolvedValue(mockUser);
    mockedAuthApi.getStoredAuth.mockResolvedValueOnce(null); // Initial load
    mockedAuthApi.getStoredAuth.mockResolvedValueOnce({ user: mockUser, token: mockToken }); // After login

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(mockedAuthApi.loginWithEmailPassword).toHaveBeenCalledWith('test@example.com', 'password');
    expect(result.current.user).toEqual(mockUser);
  });

  it('handles registration', async () => {
    const mockUser = createMockUser('123', 'test@example.com');
    mockedAuthApi.register.mockResolvedValue(mockUser);
    mockedAuthApi.loginWithEmailPassword.mockResolvedValue(mockUser);
    mockedAuthApi.getStoredAuth.mockResolvedValueOnce(null);
    mockedAuthApi.getStoredAuth.mockResolvedValueOnce({ user: mockUser, token: 'etu_session', keyId: 'key-1' });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.register('test@example.com', 'password');
    });

    expect(mockedAuthApi.register).toHaveBeenCalledWith('test@example.com', 'password');
    expect(mockedAuthApi.loginWithEmailPassword).toHaveBeenCalledWith('test@example.com', 'password');
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('etu_session');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('reports when the account was created but auto sign-in failed', async () => {
    const mockUser = createMockUser('123', 'alice@example.com');
    mockedAuthApi.register.mockResolvedValue(mockUser);
    mockedAuthApi.loginWithEmailPassword.mockRejectedValue(new Error('too many login requests'));

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.register('alice@example.com', 'password');
      }),
    ).rejects.toThrow('Account created, but signing in failed: too many login requests');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('revokes the session key on logout', async () => {
    const mockUser = createMockUser('123', 'alice@example.com');
    mockedAuthApi.getStoredAuth.mockResolvedValue({ user: mockUser, token: 'etu_session', keyId: 'key-1' });
    mockedAuthApi.revokeSession.mockResolvedValue(true);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedAuthApi.revokeSession).toHaveBeenCalledWith({ user: mockUser, token: 'etu_session', keyId: 'key-1' });
    expect(mockedAuthApi.clearStoredAuth).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears local state and logs when revoking fails', async () => {
    const mockUser = createMockUser('123', 'alice@example.com');
    mockedAuthApi.getStoredAuth.mockResolvedValue({ user: mockUser, token: 'etu_session', keyId: 'key-1' });
    mockedAuthApi.revokeSession.mockRejectedValue(new Error('network down'));

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(logger.logError).toHaveBeenCalledWith('Failed to revoke session on logout', { error: 'network down' });
    expect(mockedAuthApi.clearStoredAuth).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('does not revoke on auth errors', async () => {
    const mockUser = createMockUser('123', 'alice@example.com');
    mockedAuthApi.getStoredAuth.mockResolvedValue({ user: mockUser, token: 'etu_session', keyId: 'key-1' });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.handleAuthError();
    });

    expect(mockedAuthApi.revokeSession).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles logout', async () => {
    const mockUser = createMockUser('123', 'test@example.com');
    const mockToken = 'test-token';
    mockedAuthApi.getStoredAuth.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedAuthApi.clearStoredAuth).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears queued notes and the persisted cache on logout', async () => {
    mockedAuthApi.getStoredAuth.mockResolvedValue({
      user: createMockUser('123', 'test@example.com'),
      token: 'test-token',
    });
    await enqueueNote({ userId: '123', content: 'pending', tags: [] });
    await AsyncStorage.setItem('etu.queryCache.v1', '{}');

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
    await act(async () => {
      await result.current.logout();
    });

    expect(await getPendingNotes()).toEqual([]);
    expect(await AsyncStorage.getItem('etu.queryCache.v1')).toBeNull();
  });

  it('handles auth errors', async () => {
    const mockUser = createMockUser('123', 'test@example.com');
    const mockToken = 'test-token';
    mockedAuthApi.getStoredAuth.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.handleAuthError();
    });

    expect(mockedAuthApi.clearStoredAuth).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('refreshes user data', async () => {
    const mockUser = createMockUser('123', 'test@example.com');
    const updatedUser = createMockUser('123', 'updated@example.com');
    const mockToken = 'test-token';
    
    mockedAuthApi.getStoredAuth
      .mockResolvedValueOnce({ user: mockUser, token: mockToken })
      .mockResolvedValueOnce({ user: updatedUser, token: mockToken });

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(updatedUser);
  });
});
