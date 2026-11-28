/**
 * @format
 */

import {
  getUserSettings,
  updateUserSettings,
  listApiKeys,
  createApiKey,
  deleteApiKey,
} from '../src/api/settings';
import { userSettingsClient, apiKeysClient } from '../src/api/client';

jest.mock('../src/api/client', () => ({
  userSettingsClient: {
    client: { getUserSettings: jest.fn(), updateUserSettings: jest.fn() },
  },
  apiKeysClient: {
    client: { listApiKeys: jest.fn(), createApiKey: jest.fn(), deleteApiKey: jest.fn() },
  },
  createHeaders: (token: string) => ({ Authorization: token }),
}));

const settings = userSettingsClient.client as unknown as Record<string, jest.Mock>;
const keys = apiKeysClient.client as unknown as Record<string, jest.Mock>;
const opts = { headers: { Authorization: 'tok' } };
const user = { id: 'alice', name: 'Ada Lovelace' };
const apiKey = { id: 'k1', name: 'laptop' };

beforeEach(() => jest.clearAllMocks());

describe('getUserSettings', () => {
  it('returns the user', async () => {
    settings.getUserSettings.mockResolvedValue({ user });
    await expect(getUserSettings('alice', 'tok')).resolves.toBe(user);
    expect(settings.getUserSettings).toHaveBeenCalledWith({ userId: 'alice' }, opts);
  });

  it('throws when no user comes back', async () => {
    settings.getUserSettings.mockResolvedValue({});
    await expect(getUserSettings('alice', 'tok')).rejects.toThrow('User not found');
  });
});

describe('updateUserSettings', () => {
  it('spreads updates into the request', async () => {
    settings.updateUserSettings.mockResolvedValue({ user });
    await expect(updateUserSettings('alice', 'tok', { name: 'Ada' })).resolves.toBe(user);
    expect(settings.updateUserSettings).toHaveBeenCalledWith({ userId: 'alice', name: 'Ada' }, opts);
  });

  it('throws when no user comes back', async () => {
    settings.updateUserSettings.mockResolvedValue({});
    await expect(updateUserSettings('alice', 'tok', {})).rejects.toThrow('Update failed');
  });
});

describe('listApiKeys', () => {
  it('returns keys', async () => {
    keys.listApiKeys.mockResolvedValue({ apiKeys: [apiKey] });
    await expect(listApiKeys('alice', 'tok')).resolves.toEqual([apiKey]);
    expect(keys.listApiKeys).toHaveBeenCalledWith({ userId: 'alice' }, opts);
  });

  it('returns an empty list when keys are missing', async () => {
    keys.listApiKeys.mockResolvedValue({});
    await expect(listApiKeys('alice', 'tok')).resolves.toEqual([]);
  });
});

describe('createApiKey', () => {
  it('returns the key and raw secret', async () => {
    keys.createApiKey.mockResolvedValue({ apiKey, rawKey: 'secret' });
    await expect(createApiKey('alice', 'tok', 'laptop')).resolves.toEqual({ apiKey, rawKey: 'secret' });
    expect(keys.createApiKey).toHaveBeenCalledWith({ userId: 'alice', name: 'laptop' }, opts);
  });

  it.each([{ rawKey: 'secret' }, { apiKey }])('throws on a partial response %o', async res => {
    keys.createApiKey.mockResolvedValue(res);
    await expect(createApiKey('alice', 'tok', 'laptop')).rejects.toThrow('Create API key failed');
  });
});

it('deleteApiKey returns success', async () => {
  keys.deleteApiKey.mockResolvedValue({ success: true });
  await expect(deleteApiKey('alice', 'tok', 'k1')).resolves.toBe(true);
  expect(keys.deleteApiKey).toHaveBeenCalledWith({ userId: 'alice', keyId: 'k1' }, opts);
});
