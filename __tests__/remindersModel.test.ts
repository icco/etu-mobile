import { byTime, formatTime, parseReminders } from '../src/reminders/model';

const write = {
  id: 'a',
  label: 'Write a post',
  hour: 9,
  minute: 0,
  enabled: true,
};

test('parseRemindersKeepsValidEntries', () => {
  expect(parseReminders(null)).toEqual([]);
  expect(
    parseReminders(
      JSON.stringify([
        write,
        { ...write, id: 'b', hour: 24 },
        { ...write, id: 'c', minute: 1.5 },
        { ...write, id: '' },
        'nope',
      ]),
    ),
  ).toEqual([write]);
});

test('parseRemindersRejectsNonList', () => {
  expect(() => parseReminders('{}')).toThrow('not a list');
});

test('byTimeSortsEarliestFirst', () => {
  const late = { ...write, id: 'b', hour: 21, minute: 30 };
  const early = { ...write, id: 'c', hour: 9, minute: 0, label: 'Stretch' };
  expect([late, write, early].sort(byTime).map(r => r.id)).toEqual([
    'c',
    'a',
    'b',
  ]);
});

test('formatTimeShowsHourAndMinute', () => {
  expect(formatTime(9, 5)).toMatch(/9:05/);
});
