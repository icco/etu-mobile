import { notesClient, tagsClient, createHeaders } from './client';

export interface ImageUpload {
  data: Uint8Array;
  mimeType: string;
}

export interface AudioUpload {
  data: Uint8Array;
  mimeType: string;
}

export interface ImageUploadInput {
  data: string; // base64
  mimeType: string;
}

export interface AudioUploadInput {
  data: string; // base64
  mimeType: string;
}

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array<ArrayBufferLike> {
  // atob is a global in browser/RN; TypeScript lib may not declare it
  const binaryString = (globalThis as unknown as { atob(s: string): string }).atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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
  images?: ImageUploadInput[],
  audios?: AudioUploadInput[]
) {
  const imageUploads: ImageUpload[] | undefined = images?.map(img => ({
    data: base64ToUint8Array(img.data),
    mimeType: img.mimeType,
  }));

  const audioUploads: AudioUpload[] | undefined = audios?.map(audio => ({
    data: base64ToUint8Array(audio.data),
    mimeType: audio.mimeType,
  }));

  const res = await notesClient.client.createNote(
    { 
      userId, 
      content, 
      tags,
      images: imageUploads,
      audios: audioUploads,
    },
    { headers: createHeaders(token) }
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
  addImages?: ImageUploadInput[],
  addAudios?: AudioUploadInput[]
) {
  const imageUploads: ImageUpload[] | undefined = addImages?.map(img => ({
    data: base64ToUint8Array(img.data),
    mimeType: img.mimeType,
  }));

  const audioUploads: AudioUpload[] | undefined = addAudios?.map(audio => ({
    data: base64ToUint8Array(audio.data),
    mimeType: audio.mimeType,
  }));

  const res = await notesClient.client.updateNote(
    { 
      userId, 
      id, 
      content, 
      tags: tags ?? [], 
      updateTags,
      addImages: imageUploads,
      addAudios: audioUploads,
    },
    { headers: createHeaders(token) }
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
