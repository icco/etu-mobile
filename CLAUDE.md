# CLAUDE.md

Etu mobile — React Native journaling app talking Connect RPC to etu-backend via `@icco/etu-proto`.

## Commands

- `yarn test` / `yarn test:coverage` (Jest, 50% coverage threshold)
- `yarn lint` (eslint --fix) and `yarn typecheck` (tsc --noEmit)
- `yarn start` (Metro), `npm run android` / `npm run ios` to run the app

## Architecture

- `src/api/` — Connect RPC clients. `client.ts` exposes lazy `<service>Client.client` getters;
  call pattern: `<service>Client.client.<method>({...}, { headers: createHeaders(token) })`.
- `src/screens/` — one file per screen.
- `src/context/AuthContext.tsx` — auth state + secure token storage (react-native-keychain).
- `src/navigation/` — single root stack (auth + MainTabs + note screens); deep links use `etu://`.
- Tests live in `__tests__/`; `__mocks__/etu-proto.js` stands in for `@icco/etu-proto`
  (add new services there too). `jest.setup.js` mocks react-query, navigation, and native modules.

## Patterns

- `SettingsScreen.tsx` uses an internal section switcher (`activeSection: 'main' | 'apikeys' | 'stats'`)
  instead of extra navigator routes; queries are gated with `enabled` on the active section.
- Proto int64 fields arrive as `bigint` — convert with `Number(...)` at the API layer.

## Configuration

- Env via react-native-config: `GRPC_BACKEND_URL`, `SENTRY_DSN` (optional).
- Android release builds: see README "Android Release Signing". `android/app/build.gradle`
  reads `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` from the env.
  Never touch `android/app/release.keystore` or `keystore.credentials.txt` (gitignored secrets).
- Releases: bump `versionCode`/`versionName` in `android/app/build.gradle`, `package.json`
  version, and cut a CHANGELOG.md section.
