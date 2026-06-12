/**
 * @format
 */

import { getStats } from '../src/api/stats';
import { statsClient } from '../src/api/client';

jest.mock('../src/api/client', () => ({
  statsClient: { client: { getStats: jest.fn() } },
  createHeaders: (token: string) => ({ Authorization: token }),
}));

const mockedGetStats = statsClient.client.getStats as jest.Mock;

describe('getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetStats.mockResolvedValue({
      totalBlips: 1234n,
      uniqueTags: 56n,
      wordsWritten: 78901n,
    });
  });

  it('fetches user-scoped stats when a userId is provided', async () => {
    await getStats('test-token', 'user-1');

    expect(mockedGetStats).toHaveBeenCalledWith(
      { userId: 'user-1' },
      { headers: { Authorization: 'test-token' } }
    );
  });

  it('fetches global stats with an empty userId when none is provided', async () => {
    await getStats('test-token');

    expect(mockedGetStats).toHaveBeenCalledWith(
      { userId: '' },
      { headers: { Authorization: 'test-token' } }
    );
  });

  it('converts bigint response fields to numbers', async () => {
    const stats = await getStats('test-token', 'user-1');

    expect(stats).toEqual({
      totalBlips: 1234,
      uniqueTags: 56,
      wordsWritten: 78901,
    });
  });
});
