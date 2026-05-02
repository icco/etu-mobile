import Config from 'react-native-config';
import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initCrashReporting(): void {
  if (initialized) return;
  const dsn = Config.SENTRY_DSN?.trim();
  if (!dsn) return;
  Sentry.init({
    dsn,
    enabled: true,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
  });
  initialized = true;
}

export function isCrashReportingActive(): boolean {
  return initialized;
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, context && Object.keys(context).length > 0 ? { extra: context } : undefined);
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureMessage(message, {
    level: 'error',
    ...(context && Object.keys(context).length > 0 ? { extra: context } : {}),
  });
}
