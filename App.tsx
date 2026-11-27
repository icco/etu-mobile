/**
 * Etu Mobile – React Native app for Etu journaling
 * @format
 */

import React, { useEffect } from 'react';
import { AppState, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AuthProvider } from './src/context/AuthContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import RootNavigator from './src/navigation/RootNavigator';
import OfflineSync from './src/components/OfflineSync';
import { queryClient, persister, CACHE_MAX_AGE } from './src/api/queryClient';
import {
  showRemindersInForeground,
  syncReminders,
} from './src/reminders/notify';
import { loadReminders } from './src/reminders/store';
import { getErrorMessage } from './src/utils/errors';
import { logError } from './src/utils/logger';
import { useAppTheme } from './src/theme';

function App() {
  const { dark } = useAppTheme();

  useEffect(() => {
    showRemindersInForeground();
    const sync = () => {
      syncReminders(loadReminders).catch((e: unknown) =>
        logError('Scheduling reminders failed', {
          message: getErrorMessage(e),
        }),
      );
    };
    sync();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, []);

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
