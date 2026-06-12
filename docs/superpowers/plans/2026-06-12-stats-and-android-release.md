# Mobile Stats Parity + Android Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing Stats feature (parity with web's Settings → Stats) and produce a signed Android release AAB ready for first Play Store submission.

**Architecture:** Stats becomes a third section inside the existing SettingsScreen section switcher (`'main' | 'apikeys'` → add `'stats'`), backed by a new `getStats` API function using the StatsService Connect client. Release work is config-only: upload keystore, version/changelog cut, signed `bundleRelease`.

**Tech Stack:** React Native 0.8x, TanStack Query, Connect RPC (`@icco/etu-proto`), Jest + React Native Testing Library, Gradle.

**Backend API shape:** `StatsService.GetStats(GetStatsRequest{user_id}) → GetStatsResponse{total_blips, unique_tags, words_written}` (int64 → bigint in connect-es; empty `user_id` = global/community stats).

---

### Task 1: Stats API function

**Files:**
- Modify: `src/api/client.ts` (add `statsClient` if no StatsService client exists — mirror how `userSettingsClient` is constructed from `@icco/etu-proto`)
- Create: `src/api/stats.ts`
- Test: `__tests__/api/stats.test.ts` (mirror existing api test patterns in `__tests__/`)

- [ ] Write failing test: `getStats` returns `{ totalBlips, uniqueTags, wordsWritten }` as numbers for a mocked client response with bigint fields, for both user and global scope.
- [ ] Run `yarn test` — new test FAILS (module not found).
- [ ] Implement `src/api/stats.ts`:

```ts
import { statsClient, createHeaders } from './client';

export interface Stats {
  totalBlips: number;
  uniqueTags: number;
  wordsWritten: number;
}

export async function getStats(token: string, userId?: string): Promise<Stats> {
  const res = await statsClient.client.getStats(
    { userId: userId ?? '' },
    { headers: createHeaders(token) }
  );
  return {
    totalBlips: Number(res.totalBlips),
    uniqueTags: Number(res.uniqueTags),
    wordsWritten: Number(res.wordsWritten),
  };
}
```

(Adapt import/construction to how `src/api/client.ts` actually exposes clients — read it first; add the StatsService client there if missing, following the existing pattern exactly.)
- [ ] `yarn test` PASS. Commit: `feat: add stats API client`

### Task 2: Stats section in SettingsScreen

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Test: `__tests__/screens/SettingsScreen` test if one exists; otherwise add a focused component test for the stats section rendering numbers via mocked `getStats`.

- [ ] Extend `activeSection` union to `'main' | 'apikeys' | 'stats'`; add a "Statistics" row/button in the main section (next to where API Keys section is entered) and a back affordance consistent with how `apikeys` section behaves.
- [ ] Stats section UI: two groups matching web's stats page — "Your Statistics" (user-scoped `getStats(token, user.id)`) and "Community Statistics" (`getStats(token)`), each showing Blips, Tags, Words written with `toLocaleString()` formatting. Use `useQuery` with keys `['stats', user?.id]` and `['stats', 'global']`, enabled only when the section is active. Show loading spinner and error state consistent with existing screens (see TimelineScreen error patterns).
- [ ] Replace the existing `noteStats` hack (SettingsScreen.tsx:40-44 uses `listNotes(limit:1)` to show a count) with the real stats data if it's displayed in the main section; remove dead code if no longer used.
- [ ] `yarn test`, `yarn typecheck`, `yarn lint` all PASS. Commit: `feat: add stats section to settings (parity with web)`

### Task 3: Release version + changelog cut

**Files:**
- Modify: `android/app/build.gradle:86-87`, `CHANGELOG.md`, `package.json` version field

- [ ] Bump `versionCode` to 3 and `versionName` to `"1.1.0"` (substantial Unreleased section = minor bump).
- [ ] Cut CHANGELOG: move `[Unreleased]` contents (plus the stats feature added above) under a new `## [1.1.0] - 2026-06-12` heading; leave a fresh empty `[Unreleased]` section.
- [ ] Commit: `chore: release 1.1.0 (versionCode 3)`

### Task 4: Upload keystore + signed AAB (performed by coordinator, not subagent)

- [ ] Generate PKCS12 upload keystore at `android/app/release.keystore` (gitignored via `*.keystore`); store credentials in `android/keystore.credentials.txt` (also confirm gitignored) and tell user to move them to a password manager.
- [ ] Build: `JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ANDROID_KEYSTORE_PASSWORD=... ANDROID_KEY_ALIAS=upload ANDROID_KEY_PASSWORD=... ./gradlew bundleRelease` in `android/`.
- [ ] Verify signature with `jarsigner -verify` (or `apksigner` for APK); confirm AAB at `android/app/build/outputs/bundle/release/app-release.aab`.
- [ ] Document `gh secret set` commands for ANDROID_KEYSTORE_BASE64 / PASSWORD / ALIAS / KEY_PASSWORD so CI + deploy.yml work.

### Task 5: Docs

- [ ] Create `CLAUDE.md` (~30 lines): commands (`yarn test|lint|typecheck`), architecture (screens/api/context/navigation), section-switcher pattern in Settings, release process pointer to README, env vars (GRPC_BACKEND_URL, SENTRY_DSN).
- [ ] README: confirm release section reflects the keystore path and env var names actually used by build.gradle (it does — verify after changes).
- [ ] Commit: `docs: add CLAUDE.md`

### Verification

- [ ] `yarn test` (coverage ≥50% threshold), `yarn typecheck`, `yarn lint` clean.
- [ ] Signed AAB exists and verifies.
