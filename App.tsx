/**
 * Etu Mobile – React Native app for Etu journaling
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AuthProvider } from './src/context/AuthContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import RootNavigator from './src/navigation/RootNavigator';
import OfflineSync from './src/components/OfflineSync';
import { queryClient, persister, CACHE_MAX_AGE } from './src/api/queryClient';
import { useAppTheme } from './src/theme';

function App() {
  const { dark } = useAppTheme();

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: CACHE_MAX_AGE }}
      >
        <SafeAreaProvider>
          <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
          <AuthProvider>
            <OfflineSync />
            <RootNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
