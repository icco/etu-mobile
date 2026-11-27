import * as Notifications from 'expo-notifications';
import { ensurePermission, syncReminders } from '../src/reminders/notify';

const n = Notifications as jest.Mocked<typeof Notifications>;
const write = {
  id: 'a',
  label: 'Write a post',
  hour: 9,
  minute: 0,
  enabled: true,
};

beforeEach(() => jest.clearAllMocks());

test('syncRemindersReplacesOnlyReminderSchedules', async () => {
  n.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
    { identifier: 'reminder:old' },
    { identifier: 'other' },
  ] as Notifications.NotificationRequest[]);
  await syncReminders([write, { ...write, id: 'b', enabled: false }]);
  expect(n.cancelScheduledNotificationAsync.mock.calls).toEqual([
    ['reminder:old'],
  ]);
  expect(n.scheduleNotificationAsync.mock.calls).toEqual([
    [
      {
        identifier: 'reminder:a',
        content: { title: 'Write a post' },
        trigger: { type: 'daily', hour: 9, minute: 0, channelId: 'reminders' },
      },
    ],
  ]);
});

test('ensurePermissionAsksOnceWhenAllowed', async () => {
  n.getPermissionsAsync.mockResolvedValueOnce({
    granted: false,
    canAskAgain: true,
  } as Notifications.NotificationPermissionsStatus);
  n.requestPermissionsAsync.mockResolvedValueOnce({
    granted: false,
  } as Notifications.NotificationPermissionsStatus);
  expect(await ensurePermission()).toBe(false);
  expect(n.requestPermissionsAsync).toHaveBeenCalledTimes(1);

  n.getPermissionsAsync.mockResolvedValueOnce({
    granted: false,
    canAskAgain: false,
  } as Notifications.NotificationPermissionsStatus);
  expect(await ensurePermission()).toBe(false);
  expect(n.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});
