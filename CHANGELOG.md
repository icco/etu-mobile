# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- Updated auth flow to use proper error logging
- Improved API client with timeout configuration
- Enhanced AuthContext with handleAuthError method
- Better error messages in all auth operations
- Consistent error UI patterns across screens

### Fixed
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

[Unreleased]: https://github.com/icco/etu-mobile/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/icco/etu-mobile/releases/tag/v1.0.0
