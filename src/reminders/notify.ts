import * as Notifications from 'expo-notifications';
import type { Reminder } from './model';

const CHANNEL = 'reminders';
const PREFIX = 'reminder:';

export function isReminderNotification(identifier: string): boolean {
  return identifier.startsWith(PREFIX);
}

export function showRemindersInForeground(): void {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  });
}

async function ensureChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

export async function ensurePermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function syncReminders(reminders: Reminder[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const s of scheduled) {
    if (isReminderNotification(s.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(s.identifier);
    }
  }
  const enabled = reminders.filter(r => r.enabled);
  if (!enabled.length) {
    return;
  }
  await ensureChannel();
  for (const r of enabled) {
    await Notifications.scheduleNotificationAsync({
      identifier: PREFIX + r.id,
      content: { title: r.label },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
        channelId: CHANNEL,
      },
    });
  }
}
