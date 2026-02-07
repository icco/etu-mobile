/**
 * Etu Mobile – React Native app for Etu journaling
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/context/AuthContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import RootNavigator from './src/navigation/RootNavigator';
import { shouldRetry, getRetryDelay, logApiError } from './src/utils/errors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed queries based on error type
      retry: (failureCount, error) => shouldRetry(error, failureCount),
      retryDelay: (attemptIndex) => getRetryDelay(attemptIndex),
      // Stale time: consider data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time: keep unused data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
      // Refetch on reconnect after network loss
      refetchOnReconnect: true,
    },
    mutations: {
      // Don't retry mutations by default (can cause duplicate operations)
      retry: false,
      // Log mutation errors
      onError: (error, variables, context) => {
        logApiError(error, {
          type: 'mutation',
          context,
        });
      },
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#111" />
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
