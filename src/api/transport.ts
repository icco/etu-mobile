import { createConnectTransport } from '@connectrpc/connect-web';

const getBaseUrl = (): string => {
  // react-native-config exposes env at build time
  try {
    const Config = require('react-native-config').default;
    const url = Config?.GRPC_BACKEND_URL;
    if (url && typeof url === 'string') return url;
  } catch {
    // fallback when react-native-config not linked
  }
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
