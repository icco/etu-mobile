# etu-mobile

etu-mobile is the React Native version of Etu. It provides all of the same functionality as etu-web and etu, using etu-backend for storage.

Notes support **markdown content, tags, image uploads, and audio uploads**. Images can be uploaded directly to notes or included via markdown links (`![alt](url)`). Audio can be recorded in-app or uploaded from device storage.

## Features

- 📝 **Quick Note Capture**: Create markdown notes with tags
- 🖼️ **Image Upload**: Attach up to 10 images per note (5 MiB each)
- 🔊 **Audio Recording & Upload**: Record audio in-app or attach up to 5 audio files per note (25 MiB each)
- 📚 **Timeline View**: Browse notes chronologically grouped by date
- 🔍 **Search & Filter**: Find notes by content, tags, or date range
- 🎲 **Random Resurface**: Rediscover random notes from your past
- 🔐 **Secure Authentication**: Token-based auth with API key support
- 🔄 **Real-time Sync**: Synced with etu-backend via gRPC
- 🌙 **Dark Mode**: Beautiful dark theme optimized for mobile
- 🔗 **Deep Linking**: Support for `etu://` URL scheme

## Security

Dependencies are kept at latest versions. Transitive vulnerabilities in `markdown-it` and `fast-xml-parser` are overridden via `resolutions`. ESLint 9 is used with `@eslint/compat` and FlatCompat so the React Native config and plugins work with the new flat config format.

**Security Features**:
- Secure token storage using React Native Keychain
- Automatic logout on authentication errors (401/403)
- Smart retry logic with exponential backoff
- Comprehensive error logging and monitoring
- Request timeout protection (30s default)

## Prerequisites

- Node.js 25+
- Running [etu-backend](https://github.com/icco/etu-backend) gRPC service
- **GitHub Packages auth**: The app depends on `@icco/etu-proto` from GitHub Packages. Set `NPM_TOKEN` (or add `//npm.pkg.github.com/:_authToken=YOUR_TOKEN` to `~/.npmrc`) so `npm install` can fetch it. Use a classic PAT with `read:packages` scope.

### iOS Additional Prerequisites

- Xcode 15+ (for iOS development)
- CocoaPods (`gem install cocoapods`)
- macOS (required for iOS builds)

### Android Additional Prerequisites

- Android Studio or Android SDK
- Java Development Kit (JDK) 17+

## Setup

```bash
# Set token for @icco scope (required for yarn install)
export NPM_TOKEN=your_github_pat_with_read_packages

# Install dependencies
yarn install

# Copy environment configuration
cp .env.example .env

# Edit .env and set GRPC_BACKEND_URL to your etu-backend URL
# Example: GRPC_BACKEND_URL=http://localhost:50051
# For production: GRPC_BACKEND_URL=https://grpc.etu.timeclimbers.com
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GRPC_BACKEND_URL` | Yes | URL of the etu-backend gRPC service | `http://localhost:50051` (dev), `https://grpc.etu.timeclimbers.com` (prod) |
| `SENTRY_DSN` | No | When set, `logError` / `logException` and `ErrorBoundary` report to [Sentry](https://sentry.io) | DSN from your Sentry project |

**Important**: The app will log a warning if `GRPC_BACKEND_URL` is not set and fall back to `localhost:50051`. For production builds, always set this variable.

After adding `@sentry/react-native`, run `cd ios && pod install` before building iOS.

## Running the App

### iOS

```bash
# Install iOS dependencies
cd ios && pod install && cd ..

# Run on iOS simulator
npm run ios

# Run on specific iOS device
npx react-native run-ios --device "iPhone 15 Pro"

# Run release build
npx react-native run-ios --configuration Release
```

### Android

```bash
# Run on Android emulator or connected device
npm run android

# Run release build
npx react-native run-android --variant=release

# List connected devices
adb devices
```

## Development

```bash
# Start Metro bundler
npm start

# Run linter
npm run lint

# Run type checker
npm run typecheck

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for tests
npm run test:watch
```

## Testing

The app includes comprehensive test coverage for utilities and core functionality:

- **Unit Tests**: Logger, error utilities, date utilities
- **Integration Tests**: AuthContext, API interactions
- **Component Tests**: ErrorBoundary, screens
- **Coverage Target**: 50% minimum (configured in `jest.config.js`)

Test files are located in `__tests__/` directory. Run tests with:

```bash
npm test                 # Run all tests
npm run test:coverage    # Run with coverage report
npm run test:watch       # Watch mode for development
```

## Verifying changes without a local build

If you cannot run Android Studio, Xcode, or emulators locally, use **GitHub Actions on your PR**:

1. Open the PR → **Checks** tab → wait for **CI** to finish.
2. **Lint** job: ESLint, `tsc`, and **Jest** (`yarn test`). Run **`yarn test:coverage`** locally when you want the coverage table; the 50% thresholds in `jest.config.js` apply to that command and are not enforced on every PR until the suite grows.
3. **Android** job: downloads **`app-debug`** (installable debug APK). If repo signing secrets are absent, **`app-release-bundle-ci`** is a release-mode AAB built with the Gradle debug-signing fallback (validates Hermes, native modules, and release Gradle — not for Play upload). With `ANDROID_KEYSTORE_*` secrets, **`app-release-aab`** is the signed bundle.
4. **iOS** job: compiles the Debug simulator build (catches Pod/native breakages).

You can also run CI manually: **Actions** → **CI** → **Run workflow**. Concurrency cancels older runs on the same PR when you push new commits.

## CI/CD

Workflows run on **pushes** to `main`, `implement`, or `develop`, on **all pull requests**, and on **workflow_dispatch** (manual):

- **Lint**: ESLint, TypeScript, Jest (`yarn test`).
- **Android**: `assembleDebug` + artifact `app-debug`; signed `app-release-aab` when keystore secrets exist; otherwise `bundleRelease` smoke + artifact **`app-release-bundle-ci`**.
- **iOS**: `pod install` + simulator `xcodebuild` (no `.app` artifact uploaded today).

`yarn install` uses `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN || secrets.GITHUB_TOKEN }}` — same-repo workflows usually work with the default `GITHUB_TOKEN`; set **`NPM_TOKEN`** (PAT with `read:packages`) if installs fail (e.g. some fork PRs).

### Required Secrets

| Secret | Required for | Description |
|--------|--------------|-------------|
| `NPM_TOKEN` | Optional in CI | GitHub PAT with `read:packages` for `@icco/etu-proto` when `GITHUB_TOKEN` is not enough (e.g. forks). |

### Android Release Signing (Optional)

Set these to build and upload a signed release AAB:

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded release keystore file. |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password. |
| `ANDROID_KEY_ALIAS` | Key alias. |
| `ANDROID_KEY_PASSWORD` | Key password. |

Generate a keystore:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore \
  -alias mykey -keyalg RSA -keysize 2048 -validity 10000

# Encode for GitHub secrets
base64 -i release.keystore | pbcopy  # macOS
base64 -w 0 release.keystore          # Linux
```

### Deploy (Optional)

The **Deploy** workflow (`.github/workflows/deploy.yml`) runs on push to `main` when deploy secrets are present:

- **Play Store (internal track)**: Set `PLAY_STORE_SERVICE_ACCOUNT_JSON` (JSON key for a service account with Play Console API access) plus the Android signing secrets above. Builds AAB and uploads to the internal track.
- **TestFlight**: Set `APPLE_APP_STORE_CONNECT_API_KEY` (App Store Connect API key .p8 content), `APPLE_ISSUER_ID`, `APPLE_API_KEY_ID`, plus `APPLE_CERTIFICATE_P12_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `KEYCHAIN_PASSWORD`, and `APPLE_TEAM_ID`. Builds IPA and uploads to TestFlight.

Create an App Store Connect API key in App Store Connect → Users and Access → Keys. For the provisioning profile name in ExportOptions, ensure it matches your Xcode project (e.g. `EtuMobileApp`).

## Build Configuration

### Version Management

**Android** (`android/app/build.gradle`):
- `versionCode`: Integer version (must increment for each release)
- `versionName`: User-visible version string (e.g., "1.0", "1.1")
- `applicationId`: `com.etumobileapp`

**iOS** (configured in Xcode project):
- Bundle Identifier: `com.etumobileapp`
- Version: Set via Xcode (Marketing Version)
- Build Number: Set via Xcode (Current Project Version)

To update versions:

```bash
# Android - edit android/app/build.gradle
versionCode 2
versionName "1.1"

# iOS - use Xcode or edit project.pbxproj
# Open ios/EtuMobileApp.xcworkspace in Xcode
# Select project → Target → General → Version/Build
```

### Build Variants

The app supports standard React Native build variants:

- **Debug**: Development builds with debugging enabled
- **Release**: Optimized production builds with ProGuard (Android) and code minification

## Deep Linking

The app registers the URL scheme `etu://` with host `open` (see `AndroidManifest.xml`). Navigation uses a **single root stack** so links resolve the same way for auth and main flows.

**When signed in**

| URL | Screen |
|-----|--------|
| `etu://open` | Timeline (default tab) |
| `etu://open/capture` | Capture |
| `etu://open/random` | Random |
| `etu://open/search` | Search |
| `etu://open/settings` | Settings |
| `etu://open/note/:noteId` | Note detail |
| `etu://open/edit` | New note (capture flow) |

**When signed out**

| URL | Screen |
|-----|--------|
| `etu://open/login` | Login |
| `etu://open/register` | Register |

Opening a note link while signed out shows the auth stack; sign in, then open the link again.

## Google Play submission

Use this checklist before **Production** (internal / closed testing first is recommended).

### Console checklist

1. Create the app with package name **`com.etumobileapp`** (must match `applicationId` in Gradle).
2. **App signing**: use Play App Signing; upload key matches your CI/local release keystore.
3. **Store listing**: title, short description, full description, icon, feature graphic, phone screenshots (tablet if required by policy).
4. **Privacy policy**: public HTTPS URL describing data collection and use (backend URL, account, notes, optional crash reports if `SENTRY_DSN` is set).
5. **Content rating** questionnaire (IARC).
6. **Target API**: already **API 36** in this project.
7. **Release**: upload AAB from CI (`bundleRelease`) or locally; run **Pre-launch report** on an internal track build.

### Data safety (aligned with this codebase)

Declare in Play Console what the app actually uses:

- **Network**: notes and auth go to your configured gRPC host (`GRPC_BACKEND_URL`).
- **Account**: email/password or API key; tokens stored with the OS secure store (Keychain / Keystore-backed).
- **Photos / images**: attach images to notes (`READ_MEDIA_IMAGES`, camera, storage on older APIs).
- **Audio files**: attach or pick audio (`READ_MEDIA_AUDIO`).
- **Microphone**: in-app recording uses **`RECORD_AUDIO`**; runtime permission is requested on Android before recording.
- **Crash diagnostics** (optional): if you ship with `SENTRY_DSN`, disclose error/crash reporting and the third party (Sentry).

### Versioning

Bump `versionCode` for **every** Play upload and `versionName` for user-visible releases (`android/app/build.gradle`).

## Architecture

```
etu-mobile/
├── src/
│   ├── api/           # gRPC API client (Connect RPC)
│   ├── components/    # Reusable UI components
│   ├── context/       # React Context (Auth, etc.)
│   ├── navigation/    # React Navigation setup
│   ├── screens/       # Screen components
│   └── utils/         # Utilities (logging, errors, date)
├── android/           # Android native code
├── ios/               # iOS native code
├── __tests__/         # Test suite
└── __mocks__/         # Mock implementations
```

### Key Technologies

- **React Native 0.84**: Mobile framework
- **React Navigation 7**: Navigation library
- **TanStack Query 5**: Server state management
- **Connect RPC**: gRPC-Web client for API communication
- **React Native Keychain**: Secure token storage
- **React Native Image Picker**: Image selection and upload
- **React Native Document Picker**: Audio file selection
- **React Native Nitro Sound**: Audio recording
- **React Native FS**: File system access for reading files
- **TypeScript**: Type safety
- **Jest**: Testing framework

## API Integration

The app communicates with [etu-backend](https://github.com/icco/etu-backend) using gRPC via Connect RPC:

- **NotesService**: CRUD operations on notes
- **TagsService**: Tag management
- **AuthService**: Authentication
- **ApiKeysService**: API key management
- **UserSettingsService**: User preferences

### Authentication Flow

1. **Email/Password Login**: Authenticate → Create API key → Store in keychain
2. **API Key Login**: Verify key → Store in keychain
3. **Session Management**: Auto-logout on 401/403 errors

## Troubleshooting

### NPM Install Fails

**Error**: `401 Unauthorized` when running `yarn install`

**Solution**: Set GitHub PAT with `read:packages` scope:

```bash
export NPM_TOKEN=ghp_your_token_here
yarn install
```

Or add to `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=ghp_your_token_here
```

### iOS Build Fails

**Error**: `Pod install` fails or dependencies not found

**Solution**:

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

### Android Build Fails

**Error**: `JAVA_HOME` not set or SDK not found

**Solution**:

```bash
# Set JAVA_HOME
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home

# Set Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### Metro Bundler Cache Issues

**Error**: Stale bundle or cache issues

**Solution**:

```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear all caches
rm -rf node_modules
rm -rf ios/Pods
rm yarn.lock
yarn install
cd ios && pod install && cd ..
```

### Backend Connection Fails

**Error**: Cannot connect to backend

**Solution**:

1. Verify `GRPC_BACKEND_URL` is set correctly in `.env`
2. Ensure backend is running: `curl http://localhost:50051` should respond
3. For iOS simulator: use `http://localhost:50051` (localhost works)
4. For Android emulator: use `http://10.0.2.2:50051` (special Android localhost)
5. For physical devices: use your computer's IP address (e.g., `http://192.168.1.100:50051`)

## Subscription Management

Subscription management is currently handled through the web interface. The mobile app provides a link to [etu.timeclimbers.com/settings](https://etu.timeclimbers.com/settings) where users can manage their Stripe subscriptions ($5/year).

**Future**: In-app subscriptions via RevenueCat or native IAP are planned.

## Known Limitations

- **Markdown images**: Can be used via external URLs (`![alt](url)`) or uploaded files
- **Offline support**: Not yet implemented (requires sync mechanism)
- **Push notifications**: Not yet implemented

## More Information

- [Writing about Etu](https://writing.natwelch.com/post/765)
- [Etu Web BLIPS](https://github.com/icco/etu-web/blob/main/BLIPS.md)
- [Etu CLI](https://github.com/icco/etu)
- [Etu Web](https://github.com/icco/etu-web)
- [Etu Backend](https://github.com/icco/etu-backend)

## Contributing

Contributions are welcome! Please ensure:

1. Tests pass: `npm test`
2. Linting passes: `npm run lint`
3. TypeScript compiles: `npm run typecheck`
4. Coverage is maintained: `npm run test:coverage`

## License

See LICENSE file.
