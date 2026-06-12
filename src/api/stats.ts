import { statsClient, createHeaders } from './client';

export interface Stats {
  totalBlips: number;
  uniqueTags: number;
  wordsWritten: number;
}

export async function getStats(token: string, userId?: string): Promise<Stats> {
  const res = await statsClient.client.getStats(
    { userId: userId ?? '' },
    { headers: createHeaders(token) }
  );
  return {
    totalBlips: Number(res.totalBlips),
    uniqueTags: Number(res.uniqueTags),
    wordsWritten: Number(res.wordsWritten),
  };
}
