import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConnectError, Code } from '@connectrpc/connect';
import {
  createNote,
  type AudioUploadInput,
  type ImageUploadInput,
} from './notes';
import type { Note } from './client';
import { getErrorMessage, isNetworkError } from '../utils/errors';
import { logError, logInfo } from '../utils/logger';

export const OFFLINE_QUEUE_KEY = 'etu.offlineNoteQueue.v1';

export interface QueuedNote {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  images?: ImageUploadInput[];
  audios?: AudioUploadInput[];
  createdAt: number;
}

export type CreateNoteResult =
  | { status: 'sent'; note: Note | undefined }
  | { status: 'queued' };

export interface FlushResult {
  sent: number;
  remaining: number;
  error?: unknown;
}

let chain: Promise<unknown> = Promise.resolve();
let flushing: Promise<FlushResult> | null = null;
let counts: Record<string, number> = {};
let flushHandler: (() => void) | null = null;
const listeners = new Set<() => void>();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn);
  chain = run.catch(() => undefined);
  return run;
}

function updateCounts(queue: QueuedNote[]) {
  const next: Record<string, number> = {};
  for (const item of queue) {
    next[item.userId] = (next[item.userId] ?? 0) + 1;
  }
  counts = next;
  listeners.forEach(l => l());
}

async function readQueue(): Promise<QueuedNote[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as QueuedNote[];
    throw new Error('queue is not an array');
  } catch (error) {
    logError('Discarding unreadable offline note queue', {
      error: getErrorMessage(error),
    });
    return [];
  }
}

async function writeQueue(queue: QueuedNote[]) {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } else {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }
  updateCounts(queue);
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isQueueableError(error: unknown): boolean {
  return isNetworkError(error);
}

export function getPendingNotes(): Promise<QueuedNote[]> {
  return withLock(readQueue);
}

export function refreshPendingCount(): Promise<void> {
  return withLock(async () => updateCounts(await readQueue()));
}

export function enqueueNote(
  input: Omit<QueuedNote, 'id' | 'createdAt'>,
): Promise<QueuedNote> {
  return withLock(async () => {
    const item: QueuedNote = { ...input, id: newId(), createdAt: Date.now() };
    const queue = await readQueue();
    queue.push(item);
    await writeQueue(queue);
    return item;
  });
}

export function clearQueue(): Promise<void> {
  return withLock(() => writeQueue([]));
}

function removeItem(id: string) {
  return withLock(async () => {
    const queue = await readQueue();
    await writeQueue(queue.filter(item => item.id !== id));
  });
}

async function runFlush(userId: string, token: string): Promise<FlushResult> {
  const queue = (await getPendingNotes()).filter(i => i.userId === userId);
  let sent = 0;
  let dropped = 0;
  for (const item of queue) {
    try {
      await createNote(
        item.userId,
        token,
        item.content,
        item.tags,
        item.images,
        item.audios,
      );
    } catch (error) {
      if (error instanceof ConnectError && error.code === Code.InvalidArgument) {
        logError('Dropping queued note rejected by the server', {
          error: getErrorMessage(error),
        });
        await removeItem(item.id);
        dropped += 1;
        continue;
      }
      logError('Stopped replaying queued notes', {
        error: getErrorMessage(error),
      });
      return { sent, remaining: queue.length - sent - dropped, error };
    }
    await removeItem(item.id);
    sent += 1;
  }
  if (sent > 0) logInfo('Replayed queued notes', { sent });
  return { sent, remaining: 0 };
}

export function flushPendingNotes(
  userId: string,
  token: string,
): Promise<FlushResult> {
  if (!flushing) {
    flushing = runFlush(userId, token).finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

export async function createNoteOrQueue(
  userId: string,
  token: string,
  content: string,
  tags: string[] = [],
  images?: ImageUploadInput[],
  audios?: AudioUploadInput[],
): Promise<CreateNoteResult> {
  const queued = (await getPendingNotes()).some(i => i.userId === userId);
  if (queued) {
    const { remaining } = await flushPendingNotes(userId, token);
    if (remaining > 0) {
      await enqueueNote({ userId, content, tags, images, audios });
      return { status: 'queued' };
    }
  }
  try {
    const note = await createNote(userId, token, content, tags, images, audios);
    return { status: 'sent', note };
  } catch (error) {
    if (!isQueueableError(error)) throw error;
    await enqueueNote({ userId, content, tags, images, audios });
    return { status: 'queued' };
  }
}

export function setFlushHandler(handler: (() => void) | null) {
  flushHandler = handler;
}

export function requestFlush() {
  flushHandler?.();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePendingNoteCount(userId: string | undefined): number {
  return useSyncExternalStore(subscribe, () =>
    userId ? (counts[userId] ?? 0) : 0,
  );
}
