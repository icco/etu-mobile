import { authClient } from './client';

export async function createLoginSession(email: string, password: string) {
  const response = await authClient.client.login({ email, password });
  if (!response.rawKey) throw new Error('Login response missing session');
  return response;
}
