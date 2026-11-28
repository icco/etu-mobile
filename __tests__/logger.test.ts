/**
 * @format
 */

import { logDebug, logInfo, logWarning, logError, logException } from '../src/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs debug messages in development', () => {
    const g = globalThis as typeof globalThis & { __DEV__?: boolean };
    const originalDev = g.__DEV__;
    g.__DEV__ = true;
    logDebug('Test debug message');
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/\[DEBUG\] Test debug message$/));
    g.__DEV__ = originalDev;
  });

  it('logs info messages with context', () => {
    logInfo('Test info message', { userId: '123' });
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-.*Z\] \[INFO\] Test info message {"userId":"123"}$/));
  });

  it('logs warning messages', () => {
    logWarning('Test warning message');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[WARNING] Test warning message'));
  });

  it('logs error messages', () => {
    logError('Test error message', { errorCode: 500 });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ERROR] Test error message {"errorCode":500}'));
  });

  it('logs exceptions with stack traces', () => {
    logException(new Error('Test exception'), { source: 'test' });
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/\[ERROR\] Test exception .*"source":"test","stack":"Error: Test exception/));
  });
});
