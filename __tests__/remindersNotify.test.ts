import * as Notifications from 'expo-notifications';
import {
  changeReminders,
  ensurePermission,
  syncReminders,
} from '../src/reminders/notify';

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
  await syncReminders(() =>
    Promise.resolve([write, { ...write, id: 'b', enabled: false }]),
  );
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

test('overlapping changes apply in order from the stored list', async () => {
  let stored = [{ ...write, enabled: false }];
  const store = {
    load: () => Promise.resolve(stored),
    save: (next: typeof stored) => {
      stored = next;
      return Promise.resolve();
    },
  };
  let allow!: (status: Notifications.NotificationPermissionsStatus) => void;
  n.getPermissionsAsync.mockReturnValueOnce(
    new Promise(resolve => {
      allow = resolve;
    }),
  );
  const enable = changeReminders(
    store,
    list => list.map(r => ({ ...r, enabled: true })),
    true,
  );
  n.getAllScheduledNotificationsAsync
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      { identifier: 'reminder:a' },
    ] as Notifications.NotificationRequest[]);
  const remove = changeReminders(store, () => [], false);
  allow({ granted: true } as Notifications.NotificationPermissionsStatus);
  expect((await enable).granted).toBe(true);
  expect((await remove).reminders).toEqual([]);
  expect(stored).toEqual([]);
  expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  expect(
    n.cancelScheduledNotificationAsync.mock.invocationCallOrder[0],
  ).toBeGreaterThan(n.scheduleNotificationAsync.mock.invocationCallOrder[0]);
});
