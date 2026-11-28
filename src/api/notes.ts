import { base64Decode } from '@bufbuild/protobuf/wire';
import { notesClient, tagsClient, createHeaders } from './client';

export interface UploadInput {
  data: string; // base64
  mimeType: string;
}

const UPLOAD_TIMEOUT_MS = 120_000;

function toUploads(list?: UploadInput[]) {
  return list?.map(u => ({ data: base64Decode(u.data), mimeType: u.mimeType }));
}

function uploadOptions(token: string, ...lists: (UploadInput[] | undefined)[]) {
  const uploading = lists.some(l => l?.length);
  return { headers: createHeaders(token), timeoutMs: uploading ? UPLOAD_TIMEOUT_MS : undefined };
}

export interface ListNotesParams {
  userId: string;
  token: string;
  search?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function listNotes(params: ListNotesParams) {
  const { userId, token, search = '', tags = [], startDate = '', endDate = '', limit = 50, offset = 0 } = params;
  const res = await notesClient.client.listNotes(
    {
      userId,
      search,
      tags,
      startDate,
      endDate,
      limit,
      offset,
    },
    { headers: createHeaders(token) }
  );
  return { notes: res.notes, total: res.total, limit: res.limit, offset: res.offset };
}

export async function getNote(userId: string, token: string, id: string) {
  const res = await notesClient.client.getNote(
    { userId, id },
    { headers: createHeaders(token) }
  );
  return res.note;
}

export async function createNote(
  userId: string,
  token: string,
  content: string,
  tags: string[] = [],
  images?: UploadInput[],
  audios?: UploadInput[]
) {
  const res = await notesClient.client.createNote(
    { userId, content, tags, images: toUploads(images), audios: toUploads(audios) },
    uploadOptions(token, images, audios)
  );
  return res.note;
}

export async function updateNote(
  userId: string,
  token: string,
  id: string,
  content?: string,
  tags?: string[],
  updateTags = false,
  addImages?: UploadInput[],
  addAudios?: UploadInput[]
) {
  const res = await notesClient.client.updateNote(
    {
      userId,
      id,
      content,
      tags: tags ?? [],
      updateTags,
      addImages: toUploads(addImages),
      addAudios: toUploads(addAudios),
    },
    uploadOptions(token, addImages, addAudios)
  );
  return res.note;
}

export async function deleteNote(userId: string, token: string, id: string) {
  const res = await notesClient.client.deleteNote(
    { userId, id },
    { headers: createHeaders(token) }
  );
  return res.success;
}

export async function listTags(userId: string, token: string) {
  const res = await tagsClient.client.listTags(
    { userId },
    { headers: createHeaders(token) }
  );
  return res.tags;
}

export async function getRandomNotes(
  userId: string,
  token: string,
  count = 5
) {
  const res = await notesClient.client.getRandomNotes(
    { userId, count },
    { headers: createHeaders(token) }
  );
  return res.notes;
}
