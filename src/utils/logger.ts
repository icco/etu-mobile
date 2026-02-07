/**
 * Centralized logging utility for the app.
 * In production, this can be extended to send logs to a service like Sentry or Firebase Crashlytics.
 */

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

// In-memory log buffer for debugging
const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 100;

function addToBuffer(entry: LogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }
}

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export function logDebug(message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = { level: 'debug', message, context, timestamp: new Date() };
  addToBuffer(entry);
  
  if (__DEV__) {
    console.log(formatMessage('debug', message, context));
  }
}

export function logInfo(message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = { level: 'info', message, context, timestamp: new Date() };
  addToBuffer(entry);
  console.log(formatMessage('info', message, context));
}

export function logWarning(message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = { level: 'warning', message, context, timestamp: new Date() };
  addToBuffer(entry);
  console.warn(formatMessage('warning', message, context));
}

export function logError(message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = { level: 'error', message, context, timestamp: new Date() };
  addToBuffer(entry);
  console.error(formatMessage('error', message, context));
  
  // TODO: Send to error tracking service (Sentry, Firebase Crashlytics, etc.)
  // Example: Sentry.captureMessage(message, { level: 'error', contexts: { extra: context } });
}

export function logException(error: Error, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level: 'error',
    message: error.message,
    context: { ...context, stack: error.stack },
    timestamp: new Date(),
  };
  addToBuffer(entry);
  console.error(formatMessage('error', error.message, { ...context, stack: error.stack }));
  
  // TODO: Send to error tracking service
  // Example: Sentry.captureException(error, { contexts: { extra: context } });
}

export function getRecentLogs(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogs() {
  logBuffer.length = 0;
}
