/// <reference types="node" />

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// Use a fresh process and the real generated schemas, bypassing Jest's proto mock
// and Node's built-in encoders that otherwise hide the Hermes login crash.
describe('Hermes text encoding', () => {
  it.each(['both', 'decoder'])('loads real schemas with missing %s and round-trips UTF-8', (missing) => {
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      const originalEncoder = globalThis.TextEncoder;
      if (${JSON.stringify(missing)} === 'both') delete globalThis.TextEncoder;
      delete globalThis.TextDecoder;
      await import('./src/polyfills.js');
      if (${JSON.stringify(missing)} === 'decoder') {
        assert.equal(globalThis.TextEncoder, originalEncoder);
      }
      const { AuthenticateRequestSchema } = await import('@icco/etu-proto');
      const { create, toBinary, fromBinary } = await import('@bufbuild/protobuf');
      const request = create(AuthenticateRequestSchema, {
        email: 'test@example.com', password: 'café 日本語 🔐',
      });
      assert.deepEqual(fromBinary(AuthenticateRequestSchema,
        toBinary(AuthenticateRequestSchema, request)), request);
      assert.throws(() => new TextDecoder('utf-8', { fatal: true })
        .decode(new Uint8Array([0xff])));
    `], { cwd: join(__dirname, '..'), stdio: 'pipe' });
  });
});
