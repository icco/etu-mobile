import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { shouldRetry, getRetryDelay, logApiError } from '../utils/errors';
import { requestFlush } from './offlineQueue';

export const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

const BIGINT_TAG = '__bigint';

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'etu.queryCache.v1',
  serialize: client =>
    JSON.stringify(client, (_key, value: unknown): unknown =>
      typeof value === 'bigint' ? { [BIGINT_TAG]: value.toString() } : value,
    ),
  deserialize: text =>
    JSON.parse(text, (_key, value: unknown): unknown => {
      if (value && typeof value === 'object' && BIGINT_TAG in value) {
        return BigInt((value as Record<string, string>)[BIGINT_TAG]);
      }
      return value;
    }) as PersistedClient,
});

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onSuccess: () => {
      requestFlush();
    },
  }),
  defaultOptions: {
    queries: {
      // Retry failed queries based on error type
      retry: (failureCount, error) => shouldRetry(error, failureCount),
      retryDelay: attemptIndex => getRetryDelay(attemptIndex),
      // Stale time: consider data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Must be at least the persist maxAge or restored data is collected
      gcTime: CACHE_MAX_AGE,
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

export async function clearCachedData() {
  queryClient.clear();
  await persister.removeClient();
}
