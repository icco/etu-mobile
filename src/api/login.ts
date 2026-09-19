import { AuthService, CreateApiKeyResponseSchema } from '@icco/etu-proto';
import { getTransport } from './transport';

// Login reuses existing wire messages. Keep this additive method descriptor here
// until the backend's next published proto package includes AuthService.Login.
export async function createLoginSession(email: string, password: string): Promise<string> {
  const method = {
    ...AuthService.method.authenticate,
    name: 'Login', localName: 'login', output: CreateApiKeyResponseSchema,
  };
  const response = await getTransport().unary(method, undefined, 30000, {}, { email, password });
  if (!response.message.rawKey) throw new Error('Login response missing session');
  return response.message.rawKey;
}
