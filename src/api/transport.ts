import { createNativeGrpcTransport } from './nativeGrpc';
import Config from 'react-native-config';
import { logError, logWarning } from '../utils/logger';

const DEFAULT_GRPC_URL = 'https://grpc.etu.timeclimbers.com';

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local')
  );
}

const getBaseUrl = (): string => {
  const url = Config?.GRPC_BACKEND_URL;
  if (!url || typeof url !== 'string') {
    if (__DEV__) {
      logWarning('GRPC_BACKEND_URL not set, using the production gRPC endpoint');
      return DEFAULT_GRPC_URL;
    }
    return DEFAULT_GRPC_URL;
  }
  return url;
};

/**
 * Returns a transport URL.
 *
 * Security policy:
 *   - Reject unknown protocols outright.
 *   - In production, never speak plaintext http:// to a non-local host;
 *     upgrade to https:// instead. The previous behaviour silently
 *     prepended `http://` to bare hostnames, which let a misconfigured
 *     env var downgrade the entire app to cleartext gRPC.
 */
function resolveUrl(raw: string): string {
  // Bare hostnames (no scheme) — assume https in production, http in dev.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    const scheme = __DEV__ ? 'http' : 'https';
    if (!__DEV__) {
      logWarning('GRPC_BACKEND_URL has no scheme; defaulting to https://', { raw });
    }
    return `${scheme}://${raw}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    logError('GRPC_BACKEND_URL is not a valid URL, falling back', { raw });
    return DEFAULT_GRPC_URL;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    logError('GRPC_BACKEND_URL has unsupported protocol, falling back', {
      raw,
      protocol: parsed.protocol,
    });
    return DEFAULT_GRPC_URL;
  }

  if (parsed.protocol === 'http:' && !isLocalHost(parsed.hostname)) {
    if (__DEV__) {
      logWarning('GRPC_BACKEND_URL uses plaintext http:// for non-local host; upgrading to https://', {
        raw,
      });
    } else {
      logError('Refusing plaintext http:// in production build; upgrading to https://', { raw });
    }
    // Avoid mutating parsed.protocol (read-only in some TS libs) and rebuild instead.
    const upgraded = `https://${raw.slice('http://'.length)}`;
    return upgraded.replace(/\/$/, '');
  }

  return raw;
}

const baseUrl = getBaseUrl();
const url = resolveUrl(baseUrl);

export function createTransport() {
  return createNativeGrpcTransport(url.replace(/\/$/, ''));
}

let cachedTransport: ReturnType<typeof createNativeGrpcTransport> | null = null;

export function getTransport() {
  if (!cachedTransport) {
    cachedTransport = createTransport();
  }
  return cachedTransport;
}

export function resetTransport() {
  cachedTransport = null;
}
