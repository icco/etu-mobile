import { notesClient, tagsClient, createHeaders } from './client';

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
  tags: string[] = []
) {
  const res = await notesClient.client.createNote(
    { userId, content, tags },
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
  updateTags = false
) {
  const res = await notesClient.client.updateNote(
    { userId, id, content, tags: tags ?? [], updateTags },
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
