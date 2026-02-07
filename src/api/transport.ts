import { createConnectTransport } from '@connectrpc/connect-web';
import Config from 'react-native-config';

const getBaseUrl = (): string => {
  const url = Config?.GRPC_BACKEND_URL;
  if (url && typeof url === 'string') return url;
  return 'http://localhost:50051';
};

const baseUrl = getBaseUrl();
const url = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;

export function createTransport() {
  return createConnectTransport({
    baseUrl: url,
  });
}

let cachedTransport: ReturnType<typeof createConnectTransport> | null = null;

export function getTransport() {
  if (!cachedTransport) {
    cachedTransport = createTransport();
  }
  return cachedTransport;
}

export function resetTransport() {
  cachedTransport = null;
}
