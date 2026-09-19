declare module 'react-native-config' {
  export interface NativeConfig {
    /** HTTP mobile gateway on etu-web (not the native gRPC endpoint). */
    MOBILE_API_URL?: string;
    /** Optional Sentry DSN; when set, errors are reported via @sentry/react-native */
    SENTRY_DSN?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
