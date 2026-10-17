import RNFS from 'react-native-fs';
import { toJson } from '@bufbuild/protobuf';
import { ExportDataResponseSchema } from '@icco/etu-proto';
import { accountClient, createHeaders } from './client';
import { logWarning } from '../utils/logger';

export interface ExportProgress {
  items: number;
  notes: number;
}

const WRITE_BATCH = 100;

export async function deleteAccount(userId: string, token: string, password: string): Promise<void> {
  const res = await accountClient.client.deleteAccount(
    { userId, password },
    { headers: createHeaders(token) }
  );
  if (!res.success) throw new Error('Account deletion was not completed');
}

export async function exportData(
  userId: string,
  token: string,
  write: (chunk: string) => Promise<void>,
  onProgress?: (progress: ExportProgress) => void,
  signal?: AbortSignal
): Promise<ExportProgress> {
  const progress: ExportProgress = { items: 0, notes: 0 };
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) abort();
  try {
    let buffer = '[';
    for await (const res of accountClient.client.exportData(
      { userId },
      { headers: createHeaders(token), signal: controller.signal }
    )) {
      buffer += (progress.items === 0 ? '\n' : ',\n') + JSON.stringify(toJson(ExportDataResponseSchema, res));
      progress.items++;
      if (res.item.case === 'note') progress.notes++;
      if (progress.items % WRITE_BATCH === 0) {
        await write(buffer);
        buffer = '';
      }
      onProgress?.({ ...progress });
    }
    await write(buffer + '\n]\n');
    return progress;
  } finally {
    signal?.removeEventListener('abort', abort);
    controller.abort();
  }
}

export function exportFileName(date = new Date()): string {
  return `etu-export-${date.toISOString().slice(0, 10)}.json`;
}

export async function exportDataToFile(
  userId: string,
  token: string,
  onProgress?: (progress: ExportProgress) => void,
  signal?: AbortSignal
): Promise<{ path: string; progress: ExportProgress }> {
  const path = `${RNFS.CachesDirectoryPath}/${exportFileName()}`;
  await RNFS.writeFile(path, '', 'utf8');
  try {
    const progress = await exportData(
      userId,
      token,
      (chunk) => RNFS.appendFile(path, chunk, 'utf8'),
      onProgress,
      signal
    );
    return { path, progress };
  } catch (error) {
    await RNFS.unlink(path).catch((cleanupError: unknown) => {
      logWarning('Failed to remove partial export', { error: String(cleanupError) });
    });
    throw error;
  }
}
