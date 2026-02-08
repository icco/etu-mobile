/**
 * @format
 */

import { Timestamp } from '@bufbuild/protobuf';
import { protoTimestampToDate, formatDateGroup } from '../src/utils/date';

describe('Date Utilities', () => {
  describe('protoTimestampToDate', () => {
    it('converts Timestamp to Date', () => {
      const timestamp = Timestamp.fromDate(new Date('2024-01-15T10:30:00Z')) as Timestamp;
      const date = protoTimestampToDate(timestamp);
      
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('handles undefined timestamp', () => {
      const date = protoTimestampToDate(undefined);
      
      expect(date).toBeInstanceOf(Date);
      // Should return current date/time, so just check it's valid
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it('preserves milliseconds', () => {
      const originalDate = new Date('2024-06-20T15:45:30.123Z');
      const timestamp = Timestamp.fromDate(originalDate) as Timestamp;
      const date = protoTimestampToDate(timestamp);
      
      expect(date.getTime()).toBe(originalDate.getTime());
    });
  });

  describe('formatDateGroup', () => {
    it('returns "Today" for today\'s date', () => {
      const today = new Date();
      expect(formatDateGroup(today)).toBe('Today');
    });

    it('returns "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatDateGroup(yesterday)).toBe('Yesterday');
    });

    it('returns formatted date for dates more than 1 day ago', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const formatted = formatDateGroup(date);
      
      // Format should be like "January 15, 2024" or similar locale format
      expect(formatted).toBeTruthy();
      expect(formatted).not.toBe('Today');
      expect(formatted).not.toBe('Yesterday');
      expect(formatted).toMatch(/2024/); // Should contain the year
    });

    it('formats dates in the past week', () => {
      const date = new Date();
      date.setDate(date.getDate() - 5); // 5 days ago
      const formatted = formatDateGroup(date);
      
      expect(formatted).toBeTruthy();
      expect(formatted).not.toBe('Today');
      expect(formatted).not.toBe('Yesterday');
    });

    it('formats dates from different months', () => {
      const date = new Date('2023-06-15T10:00:00Z');
      const formatted = formatDateGroup(date);
      
      expect(formatted).toBeTruthy();
      expect(formatted).toMatch(/2023/);
    });

    it('handles dates in different years', () => {
      const date = new Date('2020-03-10T10:00:00Z');
      const formatted = formatDateGroup(date);
      
      expect(formatted).toBeTruthy();
      expect(formatted).toMatch(/2020/);
    });
  });
});
