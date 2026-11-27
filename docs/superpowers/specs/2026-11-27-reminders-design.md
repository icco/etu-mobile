# Daily reminders

## Intent

Let the user create their own reminders that show as phone notifications, such as 9:00 local time "Write a post".

## Goals

- Settings has a "Reminders" section: add a reminder (time plus label), change its time, pause it with a switch, delete it.
- Each enabled reminder fires once a day at its time in the phone's current timezone.
- Tapping the notification opens a new note.

## Non-goals

- No sync through etu-backend: reminders stay on the device.
- No weekday selection or one-off dates. Android only: the picker and channel code are not wired for iOS.

## Approaches

- Hand-written Kotlin on `AlarmManager`: no new dependency, but boot rescheduling, channels, and permissions would all be ours to maintain.
- Notifee: archived by Invertase in April 2026, whose README now points to expo-notifications.
- expo-notifications: the most downloaded maintained option and the one Notifee recommends. Needs Expo modules installed in the bare app. The user asked for a popular open source library, so this is the pick.

## Design

- `expo` SDK 58 (the release for React Native 0.88) installed with `install-expo-modules`, plus `expo-notifications` and `@react-native-community/datetimepicker` for the native time dialog.
- Reminders are a JSON list in AsyncStorage under `etu.reminders`: `{id, label, hour, minute, enabled}`.
- Reconciliation compares the scheduled notifications whose identifier starts with `reminder:` against the enabled reminders. A schedule whose label, time, and recorded timezone still match is left alone, because cancelling one that Android is delivering late would push it to tomorrow. The rest are cancelled, and a `daily` trigger is created for each reminder that lacks a current one. It runs on every change, on app start, and when the app returns to the foreground, all through one queue. A timezone change is picked up the next time the app is opened. expo-notifications restores schedules after a reboot.
- The Android 13 notification permission is requested when a reminder is added or switched on. When it is denied, Settings shows a link to the system settings.
- `SCHEDULE_EXACT_ALARM` is not requested, so Android may deliver a reminder a few minutes late.
