import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { ConnectError, Code } from '@connectrpc/connect';
import { createNote, type UploadInput } from './notes';
import type { Note } from './client';
import { getErrorMessage, isNetworkError } from '../utils/errors';
import { logError, logInfo } from '../utils/logger';

export const OFFLINE_QUEUE_KEY = 'etu.offlineNoteQueue.v1';
const FILES_DIR = `${RNFS.DocumentDirectoryPath}/offline-notes`;

// Attachments live in files: Android cannot read a storage row over about 2 MB.
// `data` is only set on entries queued before attachments moved to files.
export interface QueuedFile {
  mimeType: string;
  path?: string;
  data?: string;
}

export interface QueuedNote {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  images?: QueuedFile[];
  audios?: QueuedFile[];
  createdAt: number;
}

interface NewNote {
  userId: string;
  content: string;
  tags: string[];
  images?: UploadInput[];
  audios?: UploadInput[];
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
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
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

async function saveFiles(
  id: string,
  kind: string,
  list?: UploadInput[],
): Promise<QueuedFile[] | undefined> {
  if (!list?.length) return undefined;
  await RNFS.mkdir(FILES_DIR);
  return Promise.all(
    list.map(async (file, i) => {
      const path = `${FILES_DIR}/${id}-${kind}-${i}`;
      await RNFS.writeFile(path, file.data, 'base64');
      return { mimeType: file.mimeType, path };
    }),
  );
}

async function loadFiles(list?: QueuedFile[]): Promise<UploadInput[] | undefined> {
  if (!list?.length) return undefined;
  return Promise.all(
    list.map(async file => ({
      mimeType: file.mimeType,
      data: file.data ?? (await RNFS.readFile(file.path ?? '', 'base64')),
    })),
  );
}

async function deleteFiles(item: QueuedNote) {
  for (const file of [...(item.images ?? []), ...(item.audios ?? [])]) {
    if (!file.path) continue;
    await RNFS.unlink(file.path).catch((error: unknown) => {
      logError('Failed to delete queued attachment', {
        error: getErrorMessage(error),
      });
    });
  }
}

export function getPendingNotes(): Promise<QueuedNote[]> {
  return withLock(readQueue);
}

export function refreshPendingCount(): Promise<void> {
  return withLock(async () => updateCounts(await readQueue()));
}

export function enqueueNote(input: NewNote): Promise<QueuedNote> {
  return withLock(async () => {
    const id = newId();
    const item: QueuedNote = {
      id,
      userId: input.userId,
      content: input.content,
      tags: input.tags,
      images: await saveFiles(id, 'image', input.images),
      audios: await saveFiles(id, 'audio', input.audios),
      createdAt: Date.now(),
    };
    const queue = await readQueue();
    queue.push(item);
    await writeQueue(queue);
    return item;
  });
}

export function clearQueue(): Promise<void> {
  return withLock(async () => {
    await writeQueue([]);
    if (await RNFS.exists(FILES_DIR)) await RNFS.unlink(FILES_DIR);
  });
}

function removeItem(item: QueuedNote) {
  return withLock(async () => {
    const queue = await readQueue();
    await writeQueue(queue.filter(i => i.id !== item.id));
    await deleteFiles(item);
  });
}

// Network failures stop the replay so order is kept; a note the server refuses
// for another reason stays queued without blocking the notes behind it.
async function runFlush(userId: string, token: string): Promise<FlushResult> {
  const queue = (await getPendingNotes()).filter(i => i.userId === userId);
  let sent = 0;
  let kept = 0;
  for (const [index, item] of queue.entries()) {
    try {
      await createNote(
        item.userId,
        token,
        item.content,
        item.tags,
        await loadFiles(item.images),
        await loadFiles(item.audios),
      );
    } catch (error) {
      if (error instanceof ConnectError && error.code === Code.InvalidArgument) {
        logError('Dropping queued note rejected by the server', {
          error: getErrorMessage(error),
        });
        await removeItem(item);
        continue;
      }
      if (isNetworkError(error)) {
        logError('Stopped replaying queued notes', {
          error: getErrorMessage(error),
        });
        return { sent, remaining: kept + queue.length - index, error };
      }
      logError('Keeping queued note the server refused', {
        error: getErrorMessage(error),
      });
      kept += 1;
      continue;
    }
    await removeItem(item);
    sent += 1;
  }
  if (sent > 0) logInfo('Replayed queued notes', { sent });
  return { sent, remaining: kept };
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
  images?: UploadInput[],
  audios?: UploadInput[],
): Promise<CreateNoteResult> {
  const queued = (await getPendingNotes()).some(i => i.userId === userId);
  if (queued) {
    const { error } = await flushPendingNotes(userId, token);
    if (error) {
      await enqueueNote({ userId, content, tags, images, audios });
      return { status: 'queued' };
    }
  }
  try {
    const note = await createNote(userId, token, content, tags, images, audios);
    return { status: 'sent', note };
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    // A timed-out upload may have reached the server; resending it could duplicate the note.
    const uploading = !!(images?.length || audios?.length);
    if (uploading && error instanceof ConnectError && error.code === Code.DeadlineExceeded) {
      throw error;
    }
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
