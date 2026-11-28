import type { Note } from '../api/client';

/**
 * Convert proto Timestamp (seconds + nanos) to JS Date
 */
export function protoTimestampToDate(ts: { seconds: bigint | string; nanos?: number } | undefined): Date {
  if (!ts) return new Date();
  const sec = typeof ts.seconds === 'string' ? Number(ts.seconds) : Number(ts.seconds);
  const nanos = ts.nanos ?? 0;
  return new Date(sec * 1000 + nanos / 1_000_000);
}

export function formatDateGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const noteDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (noteDay.getTime() === today.getTime()) return 'Today';
  if (noteDay.getTime() === yesterday.getTime()) return 'Yesterday';
  const diffDays = Math.round((today.getTime() - noteDay.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'Last week';
  return date.toLocaleDateString();
}

export function groupNotesByDate(notes: Note[]): { label: string; notes: Note[] }[] {
  const groups: Record<string, Note[]> = {};
  const sorted = [...notes].sort(
    (a, b) =>
      protoTimestampToDate(b.createdAt).getTime() -
      protoTimestampToDate(a.createdAt).getTime(),
  );
  for (const note of sorted) {
    const label = formatDateGroup(protoTimestampToDate(note.createdAt));
    (groups[label] ??= []).push(note);
  }
  return Object.entries(groups).map(([label, groupNotes]) => ({
    label,
    notes: groupNotes,
  }));
}
