/**
 * Error utilities for handling API errors and retries.
 */

import { ConnectError, Code } from '@connectrpc/connect';
import { logError, logWarning } from './logger';

export interface ApiErrorContext {
  method?: string;
  endpoint?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Checks if an error is an authentication/authorization error (401/403).
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ConnectError) {
    // ConnectError codes: https://connectrpc.com/docs/protocol/#error-codes
    return error.code === Code.Unauthenticated || error.code === Code.PermissionDenied;
  }
  return false;
}

/**
 * Checks if an error is a network connectivity error.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ConnectError) {
    return error.code === Code.Unavailable || error.code === Code.DeadlineExceeded;
  }
  if (error instanceof Error) {
    // Check for common network error messages
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch')
    );
  }
  return false;
}

/**
 * Extracts a user-friendly error message from an error object.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ConnectError) {
    return error.message || 'An unexpected error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Logs an API error with context.
 */
export function logApiError(error: unknown, context?: ApiErrorContext) {
  const message = getErrorMessage(error);
  const errorContext: Record<string, unknown> = { ...context };
  
  if (error instanceof ConnectError) {
    errorContext.code = error.code;
    errorContext.rawMessage = error.rawMessage;
  }
  
  if (isAuthError(error)) {
    logWarning('Authentication error', errorContext);
  } else {
    logError('API error', { ...errorContext, message });
  }
}

/**
 * Determines if an operation should be retried based on the error.
 */
export function shouldRetry(error: unknown, attempt: number, maxAttempts = 3): boolean {
  if (attempt >= maxAttempts) {
    return false;
  }
  
  // Don't retry auth errors or client errors
  if (isAuthError(error)) {
    return false;
  }
  
  if (error instanceof ConnectError) {
    // Retry on network errors and temporary server errors
    return (
      error.code === Code.Unavailable ||
      error.code === Code.DeadlineExceeded ||
      error.code === Code.Internal ||
      error.code === Code.Unknown
    );
  }
  
  // Retry on network errors
  return isNetworkError(error);
}

/**
 * Calculates exponential backoff delay for retries.
 */
export function getRetryDelay(attempt: number, baseDelay = 1000): number {
  const MAX_RETRY_DELAY = 30000; // 30 seconds maximum
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(baseDelay * Math.pow(2, attempt), MAX_RETRY_DELAY);
}
