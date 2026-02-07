# etu-mobile

etu-mobile is the react-native version of Etu. It should have all of the same functionality of etu-web and etu, using etu-backend for storage.

Notes are **text-only** for now: create/edit support markdown content and tags; image and audio upload in notes are not implemented (backend support would be required). Markdown in notes can include image links (`![alt](url)`), which are rendered when viewing a note.

## Security

Dependencies are kept at latest versions. Transitive vulnerabilities in `markdown-it` and `fast-xml-parser` are overridden via `resolutions`. ESLint 9 is used with `@eslint/compat` and FlatCompat so the React Native config and plugins work with the new flat config format.

## Prerequisites

- Node.js 20+
- Running [etu-backend](https://github.com/icco/etu-backend) gRPC service
- **GitHub Packages auth**: The app depends on `@icco/etu-proto` from GitHub Packages. Set `NPM_TOKEN` (or add `//npm.pkg.github.com/:_authToken=YOUR_TOKEN` to `~/.npmrc`) so `npm install` can fetch it. Use a classic PAT with `read:packages` scope.

## Setup

```bash
# Optional: set token for @icco scope (required for npm install)
export NPM_TOKEN=your_github_pat_with_read_packages

npm install
cp .env.example .env
# Edit .env and set GRPC_BACKEND_URL to your etu-backend URL (e.g. http://localhost:50051)
```

### iOS

```bash
cd ios && pod install && cd ..
npx react-native run-ios
```

### Android

```bash
npx react-native run-android
```

## CI/CD

GitHub Actions run on push/PR to `main`, `implement`, and `develop`:

- **Lint**: ESLint + TypeScript. Requires `NPM_TOKEN` (GitHub Packages) in repo secrets.
- **Android**: Builds debug APK (always) and release AAB when signing secrets are set. Uploads `app-debug` and `app-release-aab` as artifacts.
- **iOS**: Builds for simulator (Debug). No IPA artifact unless you add signing and export steps.

### Build-only secrets

| Secret | Required for | Description |
|--------|--------------|-------------|
| `NPM_TOKEN` | Lint, Android, iOS | GitHub PAT with `read:packages` for `@icco/etu-proto`. |

### Android release signing (optional)

Set these to build and upload a signed release AAB:

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded release keystore file. |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password. |
| `ANDROID_KEY_ALIAS` | Key alias. |
| `ANDROID_KEY_PASSWORD` | Key password. |

Generate a keystore: `keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias mykey -keyalg RSA -keysize 2048 -validity 10000`. Then `base64 -i release.keystore | pbcopy`.

### Deploy (optional)

The **Deploy** workflow (`.github/workflows/deploy.yml`) runs on push to `main` when deploy secrets are present:

- **Play (internal track)**: Set `PLAY_STORE_SERVICE_ACCOUNT_JSON` (JSON key for a service account with Play Console API access) plus the Android signing secrets above. Builds AAB and uploads to the internal track.
- **TestFlight**: Set `APPLE_APP_STORE_CONNECT_API_KEY` (App Store Connect API key .p8 content), `APPLE_ISSUER_ID`, `APPLE_API_KEY_ID`, plus `APPLE_CERTIFICATE_P12_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `KEYCHAIN_PASSWORD`, and `APPLE_TEAM_ID`. Builds IPA and uploads to TestFlight.

Create an App Store Connect API key in App Store Connect → Users and Access → Keys. For the provisioning profile name in ExportOptions, ensure it matches your Xcode project (e.g. `EtuMobileApp`).

## Deep linking

The app registers the URL scheme `etu://`. Use `etu://open` to open the app and `etu://open/note/:noteId` to open a specific note (when authenticated). Configure the same scheme in share targets or web links if you want "open in app" behavior.

## More information

- https://writing.natwelch.com/post/765
- https://github.com/icco/etu-web/blob/main/BLIPS.md
- https://github.com/icco/etu
- https://github.com/icco/etu-web
- https://github.com/icco/etu-backend
