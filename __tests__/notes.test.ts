/**
 * @format
 */

import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  listTags,
  getRandomNotes,
} from '../src/api/notes';
import { notesClient, tagsClient } from '../src/api/client';

jest.mock('../src/api/client', () => ({
  notesClient: {
    client: {
      listNotes: jest.fn(),
      getNote: jest.fn(),
      createNote: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
      getRandomNotes: jest.fn(),
    },
  },
  tagsClient: { client: { listTags: jest.fn() } },
  createHeaders: (token: string) => ({ Authorization: token }),
}));

const notes = notesClient.client as unknown as Record<string, jest.Mock>;
const tags = tagsClient.client as unknown as Record<string, jest.Mock>;
const opts = { headers: { Authorization: 'tok' } };
const note = { id: 'n1', content: 'hello' };
// "hi" base64-encoded
const upload = { data: 'aGk=', mimeType: 'image/png' };
const bytes = new Uint8Array([104, 105]);

beforeEach(() => jest.clearAllMocks());

describe('listNotes', () => {
  it('applies defaults for optional params', async () => {
    notes.listNotes.mockResolvedValue({ notes: [note], total: 1, limit: 50, offset: 0, extra: 'x' });

    const res = await listNotes({ userId: 'alice', token: 'tok' });

    expect(notes.listNotes).toHaveBeenCalledWith(
      { userId: 'alice', search: '', tags: [], startDate: '', endDate: '', limit: 50, offset: 0 },
      opts
    );
    expect(res).toEqual({ notes: [note], total: 1, limit: 50, offset: 0 });
  });

  it('passes explicit params through', async () => {
    notes.listNotes.mockResolvedValue({ notes: [], total: 0, limit: 10, offset: 20 });

    await listNotes({
      userId: 'alice',
      token: 'tok',
      search: 'cat',
      tags: ['pets'],
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      limit: 10,
      offset: 20,
    });

    expect(notes.listNotes).toHaveBeenCalledWith(
      { userId: 'alice', search: 'cat', tags: ['pets'], startDate: '2026-01-01', endDate: '2026-02-01', limit: 10, offset: 20 },
      opts
    );
  });
});

it('getNote returns the note', async () => {
  notes.getNote.mockResolvedValue({ note });
  await expect(getNote('alice', 'tok', 'n1')).resolves.toBe(note);
  expect(notes.getNote).toHaveBeenCalledWith({ userId: 'alice', id: 'n1' }, opts);
});

describe('createNote', () => {
  it('sends no uploads by default', async () => {
    notes.createNote.mockResolvedValue({ note });

    await expect(createNote('alice', 'tok', 'hello')).resolves.toBe(note);

    expect(notes.createNote).toHaveBeenCalledWith(
      { userId: 'alice', content: 'hello', tags: [], images: undefined, audios: undefined },
      opts
    );
  });

  it('decodes base64 images and audio', async () => {
    notes.createNote.mockResolvedValue({ note });

    await createNote('alice', 'tok', 'hello', ['t'], [upload], [{ ...upload, mimeType: 'audio/m4a' }]);

    expect(notes.createNote).toHaveBeenCalledWith(
      {
        userId: 'alice',
        content: 'hello',
        tags: ['t'],
        images: [{ data: bytes, mimeType: 'image/png' }],
        audios: [{ data: bytes, mimeType: 'audio/m4a' }],
      },
      opts
    );
  });
});

describe('updateNote', () => {
  it('defaults tags and updateTags', async () => {
    notes.updateNote.mockResolvedValue({ note });

    await expect(updateNote('alice', 'tok', 'n1', 'new')).resolves.toBe(note);

    expect(notes.updateNote).toHaveBeenCalledWith(
      { userId: 'alice', id: 'n1', content: 'new', tags: [], updateTags: false, addImages: undefined, addAudios: undefined },
      opts
    );
  });

  it('decodes added images and audio', async () => {
    notes.updateNote.mockResolvedValue({ note });

    await updateNote('alice', 'tok', 'n1', undefined, ['t'], true, [upload], [upload]);

    expect(notes.updateNote).toHaveBeenCalledWith(
      {
        userId: 'alice',
        id: 'n1',
        content: undefined,
        tags: ['t'],
        updateTags: true,
        addImages: [{ data: bytes, mimeType: 'image/png' }],
        addAudios: [{ data: bytes, mimeType: 'image/png' }],
      },
      opts
    );
  });
});

it('deleteNote returns success', async () => {
  notes.deleteNote.mockResolvedValue({ success: true });
  await expect(deleteNote('alice', 'tok', 'n1')).resolves.toBe(true);
  expect(notes.deleteNote).toHaveBeenCalledWith({ userId: 'alice', id: 'n1' }, opts);
});

it('listTags returns tags', async () => {
  tags.listTags.mockResolvedValue({ tags: [{ name: 'pets' }] });
  await expect(listTags('alice', 'tok')).resolves.toEqual([{ name: 'pets' }]);
  expect(tags.listTags).toHaveBeenCalledWith({ userId: 'alice' }, opts);
});

describe('getRandomNotes', () => {
  it('defaults count to 5', async () => {
    notes.getRandomNotes.mockResolvedValue({ notes: [note] });
    await expect(getRandomNotes('alice', 'tok')).resolves.toEqual([note]);
    expect(notes.getRandomNotes).toHaveBeenCalledWith({ userId: 'alice', count: 5 }, opts);
  });

  it('passes an explicit count', async () => {
    notes.getRandomNotes.mockResolvedValue({ notes: [] });
    await getRandomNotes('alice', 'tok', 2);
    expect(notes.getRandomNotes).toHaveBeenCalledWith({ userId: 'alice', count: 2 }, opts);
  });
});
