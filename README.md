# etu-mobile

etu-mobile is the React Native version of Etu. It provides all of the same functionality as etu-web and etu, using etu-backend for storage.

Notes support **markdown content, tags, image uploads, and audio uploads**. Images can be uploaded directly to notes or included via markdown links (`![alt](url)`).

## Features

- 📝 **Quick Note Capture**: Create markdown notes with tags
- 🖼️ **Image Upload**: Attach up to 10 images per note (5 MiB each)
- 🔊 **Audio Upload**: Attach up to 5 audio files per note (25 MiB each)
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
# For production: GRPC_BACKEND_URL=https://grpc.etu.natwelch.com
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GRPC_BACKEND_URL` | Yes | URL of the etu-backend gRPC service | `http://localhost:50051` (dev), `https://grpc.etu.natwelch.com` (prod) |

**Important**: The app will log a warning if `GRPC_BACKEND_URL` is not set and fall back to `localhost:50051`. For production builds, always set this variable.

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

## CI/CD

GitHub Actions run on push/PR to `main`, `implement`, and `develop`:

- **Lint**: ESLint + TypeScript. Requires `NPM_TOKEN` (GitHub Packages) in repo secrets.
- **Test**: Jest unit tests with coverage reporting
- **Android**: Builds debug APK (always) and release AAB when signing secrets are set. Uploads `app-debug` and `app-release-aab` as artifacts.
- **iOS**: Builds for simulator (Debug). No IPA artifact unless you add signing and export steps.

### Required Secrets

| Secret | Required for | Description |
|--------|--------------|-------------|
| `NPM_TOKEN` | Lint, Test, Android, iOS | GitHub PAT with `read:packages` for `@icco/etu-proto`. |

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

The app registers the URL scheme `etu://`. Use `etu://open` to open the app and `etu://open/note/:noteId` to open a specific note (when authenticated). Configure the same scheme in share targets or web links if you want "open in app" behavior.

**Examples**:
```
etu://open                    # Open app
etu://open/note/abc123        # Open specific note
```

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

- **React Native 0.83.1**: Mobile framework
- **React Navigation 7**: Navigation library
- **TanStack Query 5**: Server state management
- **Connect RPC**: gRPC-Web client for API communication
- **React Native Keychain**: Secure token storage
- **React Native Image Picker**: Image selection and upload
- **React Native Document Picker**: Audio file selection
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

Subscription management is currently handled through the web interface. The mobile app provides a link to [etu.natwelch.com/settings](https://etu.natwelch.com/settings) where users can manage their Stripe subscriptions ($5/year).

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
