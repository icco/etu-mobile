declare module 'react-native-config' {
  export interface NativeConfig {
    /** Native gRPC endpoint (HTTP/2, TLS by default). */
    GRPC_BACKEND_URL?: string;
    /** Optional Sentry DSN; when set, errors are reported via @sentry/react-native */
    SENTRY_DSN?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
