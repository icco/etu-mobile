# etu-mobile

etu-mobile is the react-native version of Etu. It should have all of the same functionality of etu-web and etu, using etu-backend for storage.

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

## More information

- https://writing.natwelch.com/post/765
- https://github.com/icco/etu-web/blob/main/BLIPS.md
- https://github.com/icco/etu
- https://github.com/icco/etu-web
- https://github.com/icco/etu-backend
