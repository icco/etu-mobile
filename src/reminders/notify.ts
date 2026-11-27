import * as Notifications from 'expo-notifications';
import { byTime } from './model';
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

function isCurrent(
  scheduled: Notifications.NotificationRequest,
  reminder: Reminder,
  zone: string,
): boolean {
  const trigger = scheduled.trigger as {
    type?: string;
    hour?: number;
    minute?: number;
  } | null;
  return (
    scheduled.content.title === reminder.label &&
    scheduled.content.data?.zone === zone &&
    trigger?.type === 'daily' &&
    trigger.hour === reminder.hour &&
    trigger.minute === reminder.minute
  );
}

// Unchanged schedules are left alone: cancelling one that Android is
// delivering late would push it to tomorrow.
async function schedule(reminders: Reminder[]): Promise<void> {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const wanted = new Map(
    reminders.filter(r => r.enabled).map(r => [PREFIX + r.id, r]),
  );
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const s of scheduled) {
    if (!isReminderNotification(s.identifier)) {
      continue;
    }
    const reminder = wanted.get(s.identifier);
    if (reminder && isCurrent(s, reminder, zone)) {
      wanted.delete(s.identifier);
    } else {
      await Notifications.cancelScheduledNotificationAsync(s.identifier);
    }
  }
  if (!wanted.size) {
    return;
  }
  await ensureChannel();
  for (const [identifier, r] of wanted) {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: r.label, data: { zone } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
        channelId: CHANNEL,
      },
    });
  }
}

let queue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export interface ReminderStore {
  load: () => Promise<Reminder[]>;
  save: (reminders: Reminder[]) => Promise<void>;
}

export function syncReminders(load: ReminderStore['load']): Promise<void> {
  return serialized(async () => schedule(await load()));
}

export function changeReminders(
  store: ReminderStore,
  change: (reminders: Reminder[]) => Reminder[],
  needsPermission: boolean,
): Promise<{ reminders: Reminder[]; granted?: boolean }> {
  return serialized(async () => {
    const reminders = change(await store.load()).sort(byTime);
    await store.save(reminders);
    const granted = needsPermission ? await ensurePermission() : undefined;
    await schedule(reminders);
    return { reminders, granted };
  });
}
