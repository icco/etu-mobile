# Android login crash verification

The release crash reported on September 19, 2026 had two distinct traces:

- `TypeError: undefined cannot be used as a constructor` in protobuf's
  `getTextEncoding` → `BinaryReader` → `fileDesc`, triggered by the first login
  RPC loading the generated schemas. Hermes needs the Text Encoding API installed
  before the app imports those schemas. `index.js` loads `src/polyfills.js` first.
- `Screen fragments should never be restored` when Android recreated
  `MainActivity`. The activity now installs the fragment factory recommended by
  react-native-screens before calling `super.onCreate`.

## Regression checks

`yarn test __tests__/polyfills.test.ts --runInBand` runs real generated schemas in
fresh processes with missing text encoders, rather than Jest's mocked proto
package. It checks schema initialization, Unicode binary round trips, strict
UTF-8 decoding, and preservation of an existing encoder.

For device verification, build a signed standalone release using the README's
Android release instructions, then:

1. Install with `adb -d install -r android/app/build/outputs/apk/release/app-release.apk`.
2. Open the app and submit email/password login. Verify that it remains open and
   displays any RPC failure rather than terminating.
3. Background the app with Home, wait a few seconds, and run
   `adb -d shell am kill com.timeclimbers.etu`. Confirm the process has exited.
4. Reopen the existing task and confirm the login screen renders without a
   fragment restoration crash.

These steps passed on the connected Android phone with the patched release.

## Full sign-in follow-up

The production endpoint `https://grpc.etu.timeclimbers.com` currently rejects
Connect requests (`application/json`) with HTTP 415 and gRPC status 3, reporting
an invalid gRPC request content type. It also rejects `application/grpc-web+proto`.
The mobile app uses Connect's web transport, while the backend exposes native
gRPC. The follow-up replaces the web transport with native gRPC networking:
grpc-java/OkHttp on Android and gRPC ObjC on iOS. Typed TypeScript clients retain
protobuf serialization and pass binary messages to native modules. TLS,
deadlines, cancellation and gRPC status handling are provided by the native SDKs.

The backend's new `AuthService.Login` RPC exchanges credentials for a revocable
user API key, followed by `VerifyApiKey` and `GetUser` to load the user profile.
Deploy etu-backend PR #147 before enabling fresh email/password sign-in.

The signed Android release loaded real notes directly from the production gRPC
endpoint on the connected phone. After backend PR #147 was deployed, fresh
email/password login on the Android emulator succeeded with the real account.
The timeline loaded, a full process restart restored the session, and Settings
opened without a crash. The native iOS simulator build passed in macOS CI.

Stored user data now uses protobuf JSON to preserve bigint timestamp fields,
which cannot be serialized with plain `JSON.stringify(user)`. Legacy sessions
remain readable. `__tests__/auth.test.ts` covers login, persistence, legacy data,
and unsuccessful/incomplete login responses using real protobuf schemas.
