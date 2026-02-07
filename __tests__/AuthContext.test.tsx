/**
 * @format
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import * as authApi from '../src/api/auth';

// Mock the auth API
jest.mock('../src/api/auth');

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    mockedAuthApi.getStoredAuth.mockResolvedValue(null);
    mockedAuthApi.clearStoredAuth.mockResolvedValue();
  });

  it('provides auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('loads stored auth on mount', async () => {
    const mockUser = { id: '123', email: 'test@example.com', createdAt: undefined };
    const mockToken = 'test-token';
    mockedAuthApi.getStoredAuth.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login with API key', async () => {
    const mockUser = { id: '123', email: 'test@example.com', createdAt: undefined };
    mockedAuthApi.loginWithApiKey.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

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
    const mockUser = { id: '123', email: 'test@example.com', createdAt: undefined };
    const mockToken = 'generated-token';
    mockedAuthApi.loginWithEmailPassword.mockResolvedValue(mockUser);
    mockedAuthApi.getStoredAuth.mockResolvedValueOnce(null); // Initial load
    mockedAuthApi.getStoredAuth.mockResolvedValueOnce({ user: mockUser, token: mockToken }); // After login

    const { result } = renderHook(() => useAuth(), { wrapper });

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
    const mockUser = { id: '123', email: 'test@example.com', createdAt: undefined };
    mockedAuthApi.register.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.register('test@example.com', 'password');
    });

    expect(mockedAuthApi.register).toHaveBeenCalledWith('test@example.com', 'password');
    expect(result.current.user).toEqual(mockUser);
  });

  it('handles logout', async () => {
    const mockUser = { id: '123', email: 'test@example.com', createdAt: undefined };
    const mockToken = 'test-token';
    mockedAuthApi.getStoredAuth.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

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

  it('handles auth errors', async () => {
    const mockUser = { id: '123', email: 'test@example.com', createdAt: undefined };
    const mockToken = 'test-token';
    mockedAuthApi.getStoredAuth.mockResolvedValue({
      user: mockUser,
      token: mockToken,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

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
    const mockUser = { id: '123', email: 'test@example.com', createdAt: undefined };
    const updatedUser = { id: '123', email: 'updated@example.com', createdAt: undefined };
    const mockToken = 'test-token';
    
    mockedAuthApi.getStoredAuth
      .mockResolvedValueOnce({ user: mockUser, token: mockToken })
      .mockResolvedValueOnce({ user: updatedUser, token: mockToken });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(updatedUser);
  });
});
