declare module 'react-native-config' {
  export interface NativeConfig {
    GRPC_BACKEND_URL?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
