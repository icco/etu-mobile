/**
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConnectError, Code } from '@connectrpc/connect';
import {
  OFFLINE_QUEUE_KEY,
  clearQueue,
  createNoteOrQueue,
  flushPendingNotes,
  getPendingNotes,
  requestFlush,
  setFlushHandler,
} from '../src/api/offlineQueue';
import { persister } from '../src/api/queryClient';
import { createNote } from '../src/api/notes';

jest.mock('../src/api/notes', () => ({
  createNote: jest.fn(),
}));
jest.mock('../src/utils/logger');

const mockedCreateNote = jest.mocked(createNote);

beforeEach(async () => {
  mockedCreateNote.mockReset();
  await clearQueue();
});

describe('createNoteOrQueue', () => {
  it('sends directly when online', async () => {
    mockedCreateNote.mockResolvedValue({ id: 'n1' } as never);
    const result = await createNoteOrQueue('alice', 'tok', 'hello', ['a']);
    expect(result.status).toBe('sent');
    expect(await getPendingNotes()).toEqual([]);
  });

  it.each([
    ['Unavailable', new ConnectError('down', Code.Unavailable)],
    ['DeadlineExceeded', new ConnectError('slow', Code.DeadlineExceeded)],
    ['network failure', new TypeError('Network request failed')],
  ])('queues on %s', async (_name, error) => {
    mockedCreateNote.mockRejectedValue(error);
    const result = await createNoteOrQueue('alice', 'tok', 'hello', ['a']);
    expect(result).toEqual({ status: 'queued' });
    const queue = await getPendingNotes();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      userId: 'alice',
      content: 'hello',
      tags: ['a'],
    });
  });

  it.each([
    ['Unauthenticated', Code.Unauthenticated],
    ['PermissionDenied', Code.PermissionDenied],
    ['InvalidArgument', Code.InvalidArgument],
  ])('surfaces %s without queueing', async (_name, code) => {
    const error = new ConnectError('nope', code);
    mockedCreateNote.mockRejectedValue(error);
    await expect(createNoteOrQueue('alice', 'tok', 'hello')).rejects.toBe(error);
    expect(await getPendingNotes()).toEqual([]);
  });

  it('keeps order by queueing behind notes that cannot be replayed yet', async () => {
    mockedCreateNote.mockRejectedValue(new ConnectError('down', Code.Unavailable));
    await createNoteOrQueue('alice', 'tok', 'first');
    mockedCreateNote.mockResolvedValue({ id: 'n2' } as never);
    mockedCreateNote.mockRejectedValueOnce(new ConnectError('down', Code.Unavailable));
    const result = await createNoteOrQueue('alice', 'tok', 'second');
    expect(result.status).toBe('queued');
    expect((await getPendingNotes()).map(n => n.content)).toEqual([
      'first',
      'second',
    ]);
  });
});

describe('flushPendingNotes', () => {
  it('replays queued notes in order and empties the queue', async () => {
    mockedCreateNote.mockRejectedValue(new ConnectError('down', Code.Unavailable));
    await createNoteOrQueue('alice', 'tok', 'one');
    await createNoteOrQueue('alice', 'tok', 'two');
    await createNoteOrQueue('alice', 'tok', 'three');

    mockedCreateNote.mockReset();
    mockedCreateNote.mockResolvedValue({ id: 'ok' } as never);
    const result = await flushPendingNotes('alice', 'tok');

    expect(result).toEqual({ sent: 3, remaining: 0 });
    expect(mockedCreateNote.mock.calls.map(c => c[2])).toEqual([
      'one',
      'two',
      'three',
    ]);
    expect(await getPendingNotes()).toEqual([]);
  });

  it('stops at the first transient failure and keeps the rest', async () => {
    mockedCreateNote.mockRejectedValue(new ConnectError('down', Code.Unavailable));
    await createNoteOrQueue('alice', 'tok', 'one');
    await createNoteOrQueue('alice', 'tok', 'two');

    mockedCreateNote.mockReset();
    mockedCreateNote
      .mockResolvedValueOnce({ id: 'ok' } as never)
      .mockRejectedValueOnce(new ConnectError('down', Code.Unavailable));
    const result = await flushPendingNotes('alice', 'tok');

    expect(result.sent).toBe(1);
    expect(result.remaining).toBe(1);
    expect((await getPendingNotes()).map(n => n.content)).toEqual(['two']);
  });

  it('only replays notes for the given user', async () => {
    mockedCreateNote.mockRejectedValue(new ConnectError('down', Code.Unavailable));
    await createNoteOrQueue('alice', 'tok', 'mine');
    await createNoteOrQueue('bob', 'tok2', 'theirs');

    mockedCreateNote.mockReset();
    mockedCreateNote.mockResolvedValue({ id: 'ok' } as never);
    await flushPendingNotes('alice', 'tok');

    expect(mockedCreateNote).toHaveBeenCalledTimes(1);
    expect((await getPendingNotes()).map(n => n.userId)).toEqual(['bob']);
  });
});

describe('logout cleanup', () => {
  it('clearQueue removes all queued notes from storage', async () => {
    mockedCreateNote.mockRejectedValue(new ConnectError('down', Code.Unavailable));
    await createNoteOrQueue('alice', 'tok', 'one');
    expect(await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)).not.toBeNull();
    await clearQueue();
    expect(await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)).toBeNull();
  });

  it('removes the persisted query cache', async () => {
    await persister.persistClient({
      timestamp: Date.now(),
      buster: '',
      clientState: { mutations: [], queries: [] },
    });
    await new Promise(resolve => setTimeout(resolve, 150));
    await persister.removeClient();
    expect(await persister.restoreClient()).toBeUndefined();
  });
});

describe('requestFlush', () => {
  it('invokes the registered handler', () => {
    const handler = jest.fn();
    setFlushHandler(handler);
    requestFlush();
    setFlushHandler(null);
    requestFlush();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
