import {
  userSettingsClient,
  apiKeysClient,
  createHeaders,
} from './client';
import type { User, ApiKey } from './client';

export async function getUserSettings(userId: string, token: string): Promise<User> {
  const res = await userSettingsClient.client.getUserSettings(
    { userId },
    { headers: createHeaders(token) }
  );
  if (!res.user) throw new Error('User not found');
  return res.user;
}

export async function updateUserSettings(
  userId: string,
  token: string,
  updates: { name?: string; password?: string }
): Promise<User> {
  const res = await userSettingsClient.client.updateUserSettings(
    { userId, ...updates },
    { headers: createHeaders(token) }
  );
  if (!res.user) throw new Error('Update failed');
  return res.user;
}

export async function listApiKeys(userId: string, token: string): Promise<ApiKey[]> {
  const res = await apiKeysClient.client.listApiKeys(
    { userId },
    { headers: createHeaders(token) }
  );
  return res.apiKeys ?? [];
}

export async function createApiKey(
  userId: string,
  token: string,
  name: string
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const res = await apiKeysClient.client.createApiKey(
    { userId, name },
    { headers: createHeaders(token) }
  );
  if (!res.apiKey || !res.rawKey) throw new Error('Create API key failed');
  return { apiKey: res.apiKey, rawKey: res.rawKey };
}

export async function deleteApiKey(
  userId: string,
  token: string,
  keyId: string
): Promise<boolean> {
  const res = await apiKeysClient.client.deleteApiKey(
    { userId, keyId },
    { headers: createHeaders(token) }
  );
  return res.success;
}
