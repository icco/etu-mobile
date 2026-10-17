import { NativeModules } from 'react-native';
import { create, fromBinary, toBinary, type MessageInitShape } from '@bufbuild/protobuf';
import { base64Decode, base64Encode } from '@bufbuild/protobuf/wire';
import { Code, ConnectError, type Transport } from '@connectrpc/connect';

interface GrpcBridge {
  unary(id: string, endpoint: string, method: string, payload: string,
    headers: Record<string, string>, timeoutMs: number): Promise<string>;
  serverStream?(id: string, endpoint: string, method: string, payload: string,
    headers: Record<string, string>, timeoutMs: number): Promise<void>;
  next?(id: string): Promise<string | null>;
  cancel(id: string): void;
}
let nextCallId = 0;
const STREAM_TIMEOUT_MS = 15 * 60 * 1000;

function toMetadata(headers: ConstructorParameters<typeof Headers>[0]): Record<string, string> {
  const metadata: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => { metadata[key] = value; });
  return metadata;
}

function toConnectError(error: unknown, fallback: string): ConnectError {
  if (error instanceof ConnectError) return error;
  const nativeError = error as { code?: string; message?: string };
  const code = Number(nativeError.code);
  return new ConnectError(nativeError.message ?? fallback,
    Number.isInteger(code) && code >= 1 && code <= 16 ? code : Code.Unknown);
}

// Keep Connect's typed client API, but perform networking through native gRPC.
export function createNativeGrpcTransport(endpoint: string, bridge = NativeModules.EtuGrpc as GrpcBridge | undefined): Transport {
  return {
    async unary(method, signal, timeoutMs, headers: ConstructorParameters<typeof Headers>[0], input) {
      if (!bridge) throw new ConnectError('Native gRPC module unavailable; rebuild the app', Code.Unavailable);
      if (signal?.aborted) throw new ConnectError('Request cancelled', Code.Canceled);
      const id = String(++nextCallId);
      const cancel = () => bridge.cancel(id);
      const payload = base64Encode(toBinary(method.input, create(method.input, input)));
      try {
        const result = bridge.unary(id, endpoint, `${method.parent.typeName}/${method.name}`, payload,
          toMetadata(headers), timeoutMs && timeoutMs > 0 ? timeoutMs : 30000);
        signal?.addEventListener('abort', cancel);
        if (signal?.aborted) cancel();
        const response = await result;
        return {
          stream: false, service: method.parent, method,
          header: new Headers(), trailer: new Headers(),
          message: fromBinary(method.output, base64Decode(response)),
        };
      } catch (error) {
        throw toConnectError(error, 'gRPC request failed');
      } finally {
        signal?.removeEventListener('abort', cancel);
      }
    },
    async stream(method, signal, timeoutMs, headers: ConstructorParameters<typeof Headers>[0], input) {
      const native = bridge;
      if (!native?.serverStream || !native.next) {
        throw new ConnectError('Native gRPC streaming unavailable; rebuild the app', Code.Unavailable);
      }
      const serverStream = native.serverStream.bind(native);
      const next = native.next.bind(native);
      const cancel = (id: string) => native.cancel(id);
      if (method.methodKind !== 'server_streaming') {
        throw new ConnectError('Only server streaming RPCs are supported', Code.Unimplemented);
      }
      if (signal?.aborted) throw new ConnectError('Request cancelled', Code.Canceled);
      let request: MessageInitShape<typeof method.input> | undefined;
      for await (const message of input) {
        request = message;
        break;
      }
      const id = String(++nextCallId);
      const payload = base64Encode(toBinary(method.input, create(method.input, request)));
      try {
        await serverStream(id, endpoint, `${method.parent.typeName}/${method.name}`, payload,
          toMetadata(headers), timeoutMs && timeoutMs > 0 ? timeoutMs : STREAM_TIMEOUT_MS);
      } catch (error) {
        throw toConnectError(error, 'gRPC stream failed');
      }
      async function* messages() {
        const onAbort = () => cancel(id);
        let finished = false;
        signal?.addEventListener('abort', onAbort);
        try {
          if (signal?.aborted) onAbort();
          for (;;) {
            let response: string | null;
            try {
              response = await next(id);
            } catch (error) {
              finished = true;
              throw toConnectError(error, 'gRPC stream failed');
            }
            if (response === null) {
              finished = true;
              return;
            }
            yield fromBinary(method.output, base64Decode(response));
          }
        } catch (error) {
          throw toConnectError(error, 'gRPC stream failed');
        } finally {
          signal?.removeEventListener('abort', onAbort);
          if (!finished) cancel(id);
        }
      }
      return {
        stream: true, service: method.parent, method,
        header: new Headers(), trailer: new Headers(),
        message: messages(),
      };
    },
  };
}
