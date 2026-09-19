import { NativeModules } from 'react-native';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { base64Decode, base64Encode } from '@bufbuild/protobuf/wire';
import { Code, ConnectError, type Transport } from '@connectrpc/connect';

interface GrpcBridge {
  unary(id: string, endpoint: string, method: string, payload: string,
    headers: Record<string, string>, timeoutMs: number): Promise<string>;
  cancel(id: string): void;
}
let nextCallId = 0;

// Keep Connect's typed client API, but perform networking through native gRPC.
export function createNativeGrpcTransport(endpoint: string, bridge = NativeModules.EtuGrpc as GrpcBridge | undefined): Transport {
  return {
    async unary(method, signal, timeoutMs, headers: ConstructorParameters<typeof Headers>[0], input) {
      if (!bridge) throw new ConnectError('Native gRPC module unavailable; rebuild the app', Code.Unavailable);
      if (signal?.aborted) throw new ConnectError('Request cancelled', Code.Canceled);
      const id = String(++nextCallId);
      const metadata: Record<string, string> = {};
      new Headers(headers).forEach((value, key) => { metadata[key] = value; });
      const cancel = () => bridge.cancel(id);
      const payload = base64Encode(toBinary(method.input, create(method.input, input)));
      try {
        const result = bridge.unary(id, endpoint, `${method.parent.typeName}/${method.name}`, payload,
          metadata, timeoutMs && timeoutMs > 0 ? timeoutMs : 30000);
        signal?.addEventListener('abort', cancel);
        if (signal?.aborted) cancel();
        const response = await result;
        return {
          stream: false, service: method.parent, method,
          header: new Headers(), trailer: new Headers(),
          message: fromBinary(method.output, base64Decode(response)),
        };
      } catch (error) {
        if (error instanceof ConnectError) throw error;
        const nativeError = error as { code?: string; message?: string };
        const code = Number(nativeError.code);
        throw new ConnectError(nativeError.message ?? 'gRPC request failed',
          Number.isInteger(code) && code >= 1 && code <= 16 ? code : Code.Unknown);
      } finally {
        signal?.removeEventListener('abort', cancel);
      }
    },
    stream() { throw new ConnectError('Streaming RPCs are not supported by Etu', Code.Unimplemented); },
  };
}
