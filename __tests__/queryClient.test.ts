/**
 * @format
 */

import { QueryClient, dehydrate, type QueryClientConfig } from '@tanstack/react-query';
import { ConnectError, Code } from '@connectrpc/connect';
import { persister, persistOptions } from '../src/api/queryClient';
import { logError, logWarning } from '../src/utils/logger';

jest.mock('@tanstack/query-async-storage-persister', () => ({
  createAsyncStoragePersister: (opts: unknown) => opts,
}));
jest.mock('../src/utils/logger', () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
  logDebug: jest.fn(),
  logInfo: jest.fn(),
}));

type Codec = {
  serialize: (v: unknown) => string;
  deserialize: (s: string) => unknown;
};
const { serialize, deserialize } = persister as unknown as Codec;

const mockedQueryClient = QueryClient as unknown as jest.Mock<unknown, [QueryClientConfig]>;
const config = mockedQueryClient.mock.calls[0][0];
const queries = config.defaultOptions!.queries!;
const mutations = config.defaultOptions!.mutations!;
const retry = queries.retry as (count: number, error: unknown) => boolean;
const onError = mutations.onError as (error: unknown, v: unknown, c: unknown) => void;

describe('persister codec', () => {
  it('round-trips bigint values', () => {
    const client = { total: 12345678901234567890n, nested: { n: 1n, s: 'x', z: null } };
    expect(deserialize(serialize(client))).toEqual(client);
  });

  it('leaves ordinary values untouched', () => {
    expect(serialize({ a: 1, b: 'two' })).toBe('{"a":1,"b":"two"}');
    expect(deserialize('{"a":1,"b":[null,{"c":true}]}')).toEqual({ a: 1, b: [null, { c: true }] });
  });
});

describe('queryClient defaults', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retries network errors but not auth errors', () => {
    expect(retry(0, new ConnectError('down', Code.Unavailable))).toBe(true);
    expect(retry(0, new ConnectError('nope', Code.Unauthenticated))).toBe(false);
  });

  it('logs mutation auth errors as warnings', () => {
    onError(new ConnectError('nope', Code.Unauthenticated), {}, undefined);
    expect(logWarning).toHaveBeenCalledWith(
      'Authentication error',
      expect.objectContaining({ type: 'mutation', code: Code.Unauthenticated })
    );
  });

  it('logs other mutation errors as errors', () => {
    onError(new Error('boom'), {}, undefined);
    expect(logError).toHaveBeenCalledWith('API error', expect.objectContaining({ message: 'boom' }));
  });
});

it('does not persist search results', () => {
  const { QueryClient: RealQueryClient } = jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  const client = new RealQueryClient();
  client.setQueryData(['notes', 'alice'], { pages: [] });
  client.setQueryData(['notesSearch', 'alice', 'hel'], { notes: [] });
  const keys = dehydrate(client, persistOptions.dehydrateOptions).queries.map(q => q.queryKey[0]);
  expect(keys).toEqual(['notes']);
  client.clear();
});
