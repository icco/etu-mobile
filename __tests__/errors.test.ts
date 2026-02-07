/**
 * @format
 */

import { ConnectError, Code } from '@connectrpc/connect';
import {
  isAuthError,
  isNetworkError,
  getErrorMessage,
  shouldRetry,
  getRetryDelay,
} from '../src/utils/errors';

describe('Error Utilities', () => {
  describe('isAuthError', () => {
    it('returns true for unauthenticated errors', () => {
      const error = new ConnectError('Unauthenticated', Code.Unauthenticated);
      expect(isAuthError(error)).toBe(true);
    });

    it('returns true for permission_denied errors', () => {
      const error = new ConnectError('Permission denied', Code.PermissionDenied);
      expect(isAuthError(error)).toBe(true);
    });

    it('returns false for other ConnectErrors', () => {
      const error = new ConnectError('Not found', Code.NotFound);
      expect(isAuthError(error)).toBe(false);
    });

    it('returns false for regular errors', () => {
      const error = new Error('Regular error');
      expect(isAuthError(error)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('returns true for unavailable errors', () => {
      const error = new ConnectError('Service unavailable', Code.Unavailable);
      expect(isNetworkError(error)).toBe(true);
    });

    it('returns true for deadline_exceeded errors', () => {
      const error = new ConnectError('Deadline exceeded', Code.DeadlineExceeded);
      expect(isNetworkError(error)).toBe(true);
    });

    it('returns true for errors with network in message', () => {
      const error = new Error('Network connection failed');
      expect(isNetworkError(error)).toBe(true);
    });

    it('returns true for errors with timeout in message', () => {
      const error = new Error('Request timeout');
      expect(isNetworkError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      const error = new Error('Something else');
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('extracts message from ConnectError', () => {
      const error = new ConnectError('Test error message', Code.Unknown);
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('extracts message from regular Error', () => {
      const error = new Error('Regular error message');
      expect(getErrorMessage(error)).toBe('Regular error message');
    });

    it('converts non-Error objects to string', () => {
      expect(getErrorMessage('String error')).toBe('String error');
      expect(getErrorMessage(123)).toBe('123');
    });
  });

  describe('shouldRetry', () => {
    it('returns false when max attempts reached', () => {
      const error = new ConnectError('Unavailable', Code.Unavailable);
      expect(shouldRetry(error, 3, 3)).toBe(false);
      expect(shouldRetry(error, 5, 3)).toBe(false);
    });

    it('returns false for auth errors', () => {
      const error = new ConnectError('Unauthenticated', Code.Unauthenticated);
      expect(shouldRetry(error, 1, 3)).toBe(false);
    });

    it('returns true for unavailable errors within max attempts', () => {
      const error = new ConnectError('Unavailable', Code.Unavailable);
      expect(shouldRetry(error, 0, 3)).toBe(true);
      expect(shouldRetry(error, 1, 3)).toBe(true);
      expect(shouldRetry(error, 2, 3)).toBe(true);
    });

    it('returns true for deadline_exceeded errors', () => {
      const error = new ConnectError('Timeout', Code.DeadlineExceeded);
      expect(shouldRetry(error, 1, 3)).toBe(true);
    });

    it('returns true for internal errors', () => {
      const error = new ConnectError('Internal error', Code.Internal);
      expect(shouldRetry(error, 1, 3)).toBe(true);
    });

    it('returns true for unknown errors', () => {
      const error = new ConnectError('Unknown error', Code.Unknown);
      expect(shouldRetry(error, 1, 3)).toBe(true);
    });

    it('returns false for not_found errors', () => {
      const error = new ConnectError('Not found', Code.NotFound);
      expect(shouldRetry(error, 1, 3)).toBe(false);
    });

    it('returns true for network errors', () => {
      const error = new Error('Network connection failed');
      expect(shouldRetry(error, 1, 3)).toBe(true);
    });
  });

  describe('getRetryDelay', () => {
    it('calculates exponential backoff', () => {
      expect(getRetryDelay(0, 1000)).toBe(1000);  // 1s
      expect(getRetryDelay(1, 1000)).toBe(2000);  // 2s
      expect(getRetryDelay(2, 1000)).toBe(4000);  // 4s
      expect(getRetryDelay(3, 1000)).toBe(8000);  // 8s
      expect(getRetryDelay(4, 1000)).toBe(16000); // 16s
    });

    it('caps delay at 30 seconds', () => {
      expect(getRetryDelay(10, 1000)).toBe(30000);
      expect(getRetryDelay(20, 1000)).toBe(30000);
    });

    it('accepts custom base delay', () => {
      expect(getRetryDelay(0, 500)).toBe(500);
      expect(getRetryDelay(1, 500)).toBe(1000);
      expect(getRetryDelay(2, 500)).toBe(2000);
    });
  });
});
