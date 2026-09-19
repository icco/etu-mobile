// Hermes does not provide the Text Encoding API required by protobuf and Connect.
// Install it before loading any generated schemas, including Metro's lazy imports.
import textEncoding from 'text-encoding';

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = textEncoding.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = textEncoding.TextDecoder;
}
