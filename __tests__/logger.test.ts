/**
 * @format
 */

import { logDebug, logInfo, logWarning, logError, logException, getRecentLogs, clearLogs } from '../src/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    clearLogs();
    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs debug messages in development', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;
    
    logDebug('Test debug message');
    
    expect(console.log).toHaveBeenCalled();
    const logs = getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('debug');
    expect(logs[0].message).toBe('Test debug message');
    
    global.__DEV__ = originalDev;
  });

  it('logs info messages', () => {
    logInfo('Test info message', { userId: '123' });
    
    expect(console.log).toHaveBeenCalled();
    const logs = getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Test info message');
    expect(logs[0].context).toEqual({ userId: '123' });
  });

  it('logs warning messages', () => {
    logWarning('Test warning message');
    
    expect(console.warn).toHaveBeenCalled();
    const logs = getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('warning');
  });

  it('logs error messages', () => {
    logError('Test error message', { errorCode: 500 });
    
    expect(console.error).toHaveBeenCalled();
    const logs = getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].context).toEqual({ errorCode: 500 });
  });

  it('logs exceptions with stack traces', () => {
    const error = new Error('Test exception');
    logException(error, { source: 'test' });
    
    expect(console.error).toHaveBeenCalled();
    const logs = getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].message).toBe('Test exception');
    expect(logs[0].context).toHaveProperty('stack');
    expect(logs[0].context).toHaveProperty('source', 'test');
  });

  it('maintains a buffer of recent logs', () => {
    for (let i = 0; i < 10; i++) {
      logInfo(`Message ${i}`);
    }
    
    const logs = getRecentLogs();
    expect(logs).toHaveLength(10);
    expect(logs[0].message).toBe('Message 0');
    expect(logs[9].message).toBe('Message 9');
  });

  it('limits buffer size to MAX_LOG_BUFFER', () => {
    // Log more than MAX_LOG_BUFFER (100) messages
    for (let i = 0; i < 150; i++) {
      logInfo(`Message ${i}`);
    }
    
    const logs = getRecentLogs();
    expect(logs).toHaveLength(100);
    // First 50 messages should have been dropped
    expect(logs[0].message).toBe('Message 50');
    expect(logs[99].message).toBe('Message 149');
  });

  it('clears logs', () => {
    logInfo('Message 1');
    logInfo('Message 2');
    expect(getRecentLogs()).toHaveLength(2);
    
    clearLogs();
    expect(getRecentLogs()).toHaveLength(0);
  });

  it('adds timestamps to log entries', () => {
    const beforeTime = new Date();
    logInfo('Test message');
    const afterTime = new Date();
    
    const logs = getRecentLogs();
    expect(logs[0].timestamp).toBeInstanceOf(Date);
    expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });
});
