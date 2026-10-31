# 1.0.0 (2026-10-31)


### Bug Fixes

* add github settings ([d5da7e8](https://github.com/icco/etu-mobile/commit/d5da7e8e109060756c21554757caa82796b09029))
* **ci:** give setup-node the registry token ([#188](https://github.com/icco/etu-mobile/issues/188)) ([c3d4d46](https://github.com/icco/etu-mobile/commit/c3d4d4693db156500468502ecfeb9103419226cf))
* compile CI for a generic iOS simulator ([#227](https://github.com/icco/etu-mobile/issues/227)) ([22dd54f](https://github.com/icco/etu-mobile/commit/22dd54f8d89831e75ad5f454d529abc6f5919cb4))
* ios build ([a218f4e](https://github.com/icco/etu-mobile/commit/a218f4e119f62c8957ca9882765c59d70bd6d936))
* make standalone Android release builds reproducible ([#222](https://github.com/icco/etu-mobile/issues/222)) ([842a1e8](https://github.com/icco/etu-mobile/commit/842a1e8e4f6ad9cc100995df675b528a9cb255ef))
* prevent Hermes login and Android restoration crashes ([#224](https://github.com/icco/etu-mobile/issues/224)) ([4551ff2](https://github.com/icco/etu-mobile/commit/4551ff2ce7a3ba0076363f728e3296632e5cc30d))
* **react-hooks:** adopt 'sync during render' pattern in edit screens ([46c543f](https://github.com/icco/etu-mobile/commit/46c543fca183c67eb2aaf5b4fdb47a90fd0c262a))
* resolve Android launch crashes ([#223](https://github.com/icco/etu-mobile/issues/223)) ([f70c1d2](https://github.com/icco/etu-mobile/commit/f70c1d241cb040badbaef27bf82336c9e66dfc98))
* use native grpc and backend login sessions ([#225](https://github.com/icco/etu-mobile/issues/225)) ([df129a5](https://github.com/icco/etu-mobile/commit/df129a58d221a472e19f049548aa20a167669718)), closes [icco/etu-backend#147](https://github.com/icco/etu-backend/issues/147)


### Features

* add custom adaptive Android icons ([3642b9d](https://github.com/icco/etu-mobile/commit/3642b9d850826aa5afa991d34b811104a3644fae))
* autolink bare urls in notes ([#257](https://github.com/icco/etu-mobile/issues/257)) ([e0835c2](https://github.com/icco/etu-mobile/commit/e0835c26f9d0071308a87dad498dc8cd4f9d44f8))
* Initial Implementation ([#1](https://github.com/icco/etu-mobile/issues/1)) ([689f11e](https://github.com/icco/etu-mobile/commit/689f11eb549cc6c9993c9c2f25eefaf3ba9851f0))
* link legal policies from settings ([#244](https://github.com/icco/etu-mobile/issues/244)) ([e83f29a](https://github.com/icco/etu-mobile/commit/e83f29ae2ea5b8d1eb28b004ea4c2be6be986b76)), closes [icco/etu-web#228](https://github.com/icco/etu-web/issues/228)
* offline capture, logout revoke, auto-login after register ([#245](https://github.com/icco/etu-mobile/issues/245)) ([7644e10](https://github.com/icco/etu-mobile/commit/7644e10d58a5667b61793aa50379b80f389cb524))
* redesign mobile with Nord-inspired Material styling ([#228](https://github.com/icco/etu-mobile/issues/228)) ([6f995a7](https://github.com/icco/etu-mobile/commit/6f995a7360fea00c241a241bd71c71bb208e1ffe))
* stats section + 1.1.0 release prep ([#146](https://github.com/icco/etu-mobile/issues/146)) ([3a92f27](https://github.com/icco/etu-mobile/commit/3a92f27d73b08acb64d112b40b024278f757c044))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Android `applicationId` is now `com.timeclimbers.etu` (Play package name; `namespace` unchanged)
- Reverted react-native 0.87.1 (#206) back to 0.85.3 — it forces AGP 9, which removed the
  `BaseExtension` every external Kotlin Gradle plugin needs, and six deps still apply
  `kotlin-android` (five already at their latest release). Unbuildable until they catch up.
- Gradle wrapper `networkTimeout` 10s -> 120s; 10s is too short to fetch a distribution

### Fixed
- Release builds now fail if `android/app/release.keystore` is missing instead of silently signing with the debug key

## [1.1.1] - 2026-09-19

### Fixed
- Restore the `EtuMobileApp` JavaScript registration name expected by the Android and iOS entry points, fixing the immediate launch crash.
- Pin React to 19.2.3 to match React Native's renderer and avoid its fatal version-mismatch error.
- Add a regression check that the app registration name matches both native entry points.

## [1.1.0] - 2026-06-12

### Added
- Statistics section in Settings (your stats + community stats)
- Android `RECORD_AUDIO` and runtime microphone prompt before in-app audio recording
- Timeline infinite scroll (paged `listNotes` with pull-to-refresh reset)
- Optional Sentry reporting via `SENTRY_DSN` (`crashReporting.ts`, `logger`, `ErrorBoundary`)
- Google Play submission and Data safety guidance in README
- CI: all PRs + `workflow_dispatch`, concurrency, `NPM_TOKEN || GITHUB_TOKEN`, Android `bundleRelease` smoke artifact when unsigned, README “verify without local build”
- Comprehensive error handling and logging infrastructure
  - Centralized logging utility with multiple log levels (debug, info, warning, error)
  - Error utility for handling API errors, auth errors, and network errors
  - Smart retry logic with exponential backoff for failed requests
  - Automatic logout on authentication errors (401/403)
- Comprehensive test suite
  - Unit tests for logger utility
  - Unit tests for error utility
  - Unit tests for date utility
  - Integration tests for AuthContext
  - Component tests for ErrorBoundary
  - Jest coverage configuration with 50% minimum threshold
  - Test scripts: `test`, `test:coverage`, `test:watch`
- Error states across all screens
  - TimelineScreen: Error display with pull-to-refresh retry
  - SearchScreen: Error display with detailed messages
  - RandomScreen: Error display with user-friendly messages
  - NoteDetailScreen: Enhanced error messages with details
- Production-ready configurations
  - Environment validation (warns if GRPC_BACKEND_URL not set in production)
  - Request timeout configuration (30s default)
  - React Query smart retry and caching configuration
  - Improved error messages throughout the app
- Enhanced documentation
  - Comprehensive README with setup, development, testing, and troubleshooting sections
  - Environment variables documentation
  - CI/CD documentation
  - Architecture overview
  - Troubleshooting guide

### Changed
- Root navigation is a single stack (auth + main + note screens) for reliable `etu://` deep links; documented `login` / `register` paths
- Updated auth flow to use proper error logging
- Improved API client with timeout configuration
- Enhanced AuthContext with handleAuthError method
- Better error messages in all auth operations
- Consistent error UI patterns across screens

### Fixed
- Removed empty `NSLocationWhenInUseUsageDescription` from iOS `Info.plist` (app does not use location)
- Silent failures in auth flow (API key creation)
- Missing error states in SearchScreen
- Inconsistent error handling across screens
- Missing environment validation

## [1.0.0] - Initial Release

### Added
- React Native mobile app for Etu journaling
- Core features:
  - User authentication (email/password and API key)
  - Note creation with markdown and tags
  - Timeline view with date grouping
  - Search and filter functionality
  - Random note discovery ("Resurface" feature)
  - Settings and API key management
- React Navigation setup with bottom tabs and stack navigation
- gRPC API client using Connect RPC
- Secure token storage with React Native Keychain
- Dark theme optimized for mobile
- Deep linking support (`etu://` scheme)
- CI/CD workflows for Android and iOS
- ESLint and TypeScript configuration
- Jest testing setup

[Unreleased]: https://github.com/icco/etu-mobile/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/icco/etu-mobile/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/icco/etu-mobile/releases/tag/v1.0.0
