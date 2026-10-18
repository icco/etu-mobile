import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  flushPendingNotes,
  refreshPendingCount,
  setFlushHandler,
} from '../api/offlineQueue';
import { queryClient } from '../api/queryClient';
import { getErrorMessage } from '../utils/errors';
import { logError } from '../utils/logger';

export default function OfflineSync() {
  const { user, token } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    void refreshPendingCount().catch(error => {
      logError('Failed to read offline note queue', {
        error: getErrorMessage(error),
      });
    });
    if (!userId || !token) return;

    const flush = () => {
      flushPendingNotes(userId, token)
        .then(({ sent }) => {
          if (sent > 0) {
            void queryClient.invalidateQueries({ queryKey: ['notes', userId] });
          }
        })
        .catch(error => {
          logError('Failed to replay offline notes', {
            error: getErrorMessage(error),
          });
        });
    };

    setFlushHandler(flush);
    flush();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') flush();
    });
    return () => {
      sub.remove();
      setFlushHandler(null);
    };
  }, [userId, token]);

  return null;
}
