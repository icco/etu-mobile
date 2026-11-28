/**
 * Centralized logging utility for the app.
 */

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export function logDebug(message: string, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(formatMessage('debug', message, context));
  }
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  console.log(formatMessage('info', message, context));
}

export function logWarning(message: string, context?: Record<string, unknown>) {
  console.warn(formatMessage('warning', message, context));
}

export function logError(message: string, context?: Record<string, unknown>) {
  console.error(formatMessage('error', message, context));
}

export function logException(error: Error, context?: Record<string, unknown>) {
  console.error(formatMessage('error', error.message, { ...context, stack: error.stack }));
}
