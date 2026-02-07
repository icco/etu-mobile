import { createConnectTransport } from '@connectrpc/connect-web';
import Config from 'react-native-config';
import { logError, logWarning } from '../utils/logger';

const getBaseUrl = (): string => {
  const url = Config?.GRPC_BACKEND_URL;
  if (url && typeof url === 'string') {
    return url;
  }
  
  // Warn about using localhost - likely misconfiguration in production
  if (__DEV__) {
    logWarning('GRPC_BACKEND_URL not set, using localhost:50051');
  } else {
    logError('GRPC_BACKEND_URL not configured for production build');
  }
  
  return 'http://localhost:50051';
};

const baseUrl = getBaseUrl();
const url = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;

export function createTransport() {
  return createConnectTransport({
    baseUrl: url,
    // Set reasonable timeout for mobile network conditions
    // Default is no timeout, which can cause hangs
    defaultTimeoutMs: 30000, // 30 seconds
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
