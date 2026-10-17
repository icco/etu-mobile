import { create } from '@bufbuild/protobuf';
import { ExportDataResponseSchema } from '@icco/etu-proto';
import RNFS from 'react-native-fs';
import { deleteAccount, exportData, exportDataToFile, exportFileName } from '../src/api/account';
import { accountClient } from '../src/api/client';

jest.mock('@icco/etu-proto', () => jest.requireActual<typeof import('@icco/etu-proto')>('../node_modules/@icco/etu-proto/dist/etu_pb.js'));
jest.mock('../src/utils/logger');
jest.mock('../src/api/client', () => ({
  createHeaders: (token: string) => ({ Authorization: token }),
  accountClient: { client: { deleteAccount: jest.fn(), exportData: jest.fn() } },
}));

const items = [
  create(ExportDataResponseSchema, { item: { case: 'user', value: { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' } } }),
  create(ExportDataResponseSchema, { item: { case: 'profileImageUrl', value: 'https://storage.example.com/ada.png' } }),
  create(ExportDataResponseSchema, { item: { case: 'tag', value: { id: 'tag-1', name: 'math', count: 2 } } }),
  create(ExportDataResponseSchema, { item: { case: 'note', value: { id: 'n1', content: 'engine notes', tags: ['math'] } } }),
  create(ExportDataResponseSchema, { item: { case: 'note', value: { id: 'n2', content: 'bernoulli numbers' } } }),
];

async function* stream(list: unknown[], error?: Error) {
  for (const item of list) yield item;
  if (error) throw error;
}

beforeEach(() => jest.clearAllMocks());

describe('deleteAccount', () => {
  it('sends the user id and password with auth headers', async () => {
    jest.mocked(accountClient.client.deleteAccount).mockResolvedValue({ success: true } as never);
    await deleteAccount('user-1', 'etu_key', 'hunter22');
    expect(accountClient.client.deleteAccount).toHaveBeenCalledWith(
      { userId: 'user-1', password: 'hunter22' },
      { headers: { Authorization: 'etu_key' } },
    );
  });

  it('throws when the backend does not confirm deletion', async () => {
    jest.mocked(accountClient.client.deleteAccount).mockResolvedValue({ success: false } as never);
    await expect(deleteAccount('user-1', 'etu_key', 'hunter22')).rejects.toThrow('Account deletion was not completed');
  });

  it('propagates rpc errors', async () => {
    jest.mocked(accountClient.client.deleteAccount).mockRejectedValue(new Error('incorrect password'));
    await expect(deleteAccount('user-1', 'etu_key', 'wrong')).rejects.toThrow('incorrect password');
  });
});

describe('exportData', () => {
  it('writes a JSON array of protojson export items and reports progress', async () => {
    jest.mocked(accountClient.client.exportData).mockReturnValue(stream(items) as never);
    const chunks: string[] = [];
    const onProgress = jest.fn();
    const result = await exportData('user-1', 'etu_key', async (chunk) => { chunks.push(chunk); }, onProgress);

    expect(accountClient.client.exportData).toHaveBeenCalledWith(
      { userId: 'user-1' },
      { headers: { Authorization: 'etu_key' }, signal: expect.any(AbortSignal) },
    );
    const json = chunks.join('');
    expect(json.startsWith('[\n')).toBe(true);
    expect(json.endsWith('\n]\n')).toBe(true);
    expect(JSON.parse(json)).toEqual([
      { user: { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' } },
      { profileImageUrl: 'https://storage.example.com/ada.png' },
      { tag: { id: 'tag-1', name: 'math', count: 2 } },
      { note: { id: 'n1', content: 'engine notes', tags: ['math'] } },
      { note: { id: 'n2', content: 'bernoulli numbers' } },
    ]);
    expect(result).toEqual({ items: 5, notes: 2 });
    expect(onProgress).toHaveBeenCalledTimes(5);
    expect(onProgress).toHaveBeenLastCalledWith({ items: 5, notes: 2 });
  });

  it('writes an empty array when the stream has no items', async () => {
    jest.mocked(accountClient.client.exportData).mockReturnValue(stream([]) as never);
    const chunks: string[] = [];
    await exportData('user-1', 'etu_key', async (chunk) => { chunks.push(chunk); });
    expect(JSON.parse(chunks.join(''))).toEqual([]);
  });

  it('flushes large exports in batches', async () => {
    const notes = Array.from({ length: 250 }, (_, i) =>
      create(ExportDataResponseSchema, { item: { case: 'note', value: { id: `n${i}` } } }));
    jest.mocked(accountClient.client.exportData).mockReturnValue(stream(notes) as never);
    const write = jest.fn((_chunk: string) => Promise.resolve());
    const result = await exportData('user-1', 'etu_key', write);
    expect(write).toHaveBeenCalledTimes(3);
    expect(JSON.parse(write.mock.calls.map(([chunk]) => chunk).join(''))).toHaveLength(250);
    expect(result.notes).toBe(250);
  });

  it('forwards caller aborts to the stream', async () => {
    const caller = new AbortController();
    let abortedDuringStream = false;
    jest.mocked(accountClient.client.exportData).mockImplementation(((_req: unknown, options?: { signal?: AbortSignal }) =>
      (async function* () {
        caller.abort();
        abortedDuringStream = options?.signal?.aborted ?? false;
        yield* [];
      })()) as never);
    await exportData('user-1', 'etu_key', () => Promise.resolve(), undefined, caller.signal);
    expect(abortedDuringStream).toBe(true);
  });

  it('aborts the stream when writing fails', async () => {
    const notes = Array.from({ length: 150 }, (_, i) =>
      create(ExportDataResponseSchema, { item: { case: 'note', value: { id: `n${i}` } } }));
    jest.mocked(accountClient.client.exportData).mockReturnValue(stream(notes) as never);
    await expect(exportData('user-1', 'etu_key', () => Promise.reject(new Error('disk full')))).rejects.toThrow('disk full');
    const [, options] = jest.mocked(accountClient.client.exportData).mock.calls[0];
    expect(options?.signal?.aborted).toBe(true);
  });

  it('rejects when the stream fails midway', async () => {
    jest.mocked(accountClient.client.exportData).mockReturnValue(stream(items.slice(0, 2), new Error('stream broke')) as never);
    await expect(exportData('user-1', 'etu_key', () => Promise.resolve())).rejects.toThrow('stream broke');
  });
});

describe('exportDataToFile', () => {
  it('streams the export into a dated cache file', async () => {
    jest.mocked(accountClient.client.exportData).mockReturnValue(stream(items) as never);
    const { path, progress } = await exportDataToFile('user-1', 'etu_key');
    expect(path).toBe(`/cache/${exportFileName()}`);
    expect(RNFS.writeFile).toHaveBeenCalledWith(path, '', 'utf8');
    const written = jest.mocked(RNFS.appendFile).mock.calls.map(([, chunk]) => chunk).join('');
    expect(JSON.parse(written)).toHaveLength(5);
    expect(progress).toEqual({ items: 5, notes: 2 });
    expect(RNFS.unlink).not.toHaveBeenCalled();
  });

  it('removes the partial file when the export fails', async () => {
    jest.mocked(accountClient.client.exportData).mockReturnValue(stream([], new Error('denied')) as never);
    await expect(exportDataToFile('user-1', 'etu_key')).rejects.toThrow('denied');
    expect(RNFS.unlink).toHaveBeenCalledWith(`/cache/${exportFileName()}`);
  });
});

it('names exports by date', () => {
  expect(exportFileName(new Date('2026-10-17T12:00:00Z'))).toBe('etu-export-2026-10-17.json');
});
