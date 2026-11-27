export interface Reminder {
  id: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

function isReminder(v: unknown): v is Reminder {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    r.id !== '' &&
    typeof r.label === 'string' &&
    Number.isInteger(r.hour) &&
    (r.hour as number) >= 0 &&
    (r.hour as number) <= 23 &&
    Number.isInteger(r.minute) &&
    (r.minute as number) >= 0 &&
    (r.minute as number) <= 59 &&
    typeof r.enabled === 'boolean'
  );
}

export function parseReminders(json: string | null): Reminder[] {
  if (!json) {
    return [];
  }
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('stored reminders are not a list');
  }
  return parsed.filter(isReminder);
}

export function byTime(a: Reminder, b: Reminder): number {
  return (
    a.hour - b.hour || a.minute - b.minute || a.label.localeCompare(b.label)
  );
}

export function timeOfDay(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function formatTime(hour: number, minute: number): string {
  return timeOfDay(hour, minute).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}
