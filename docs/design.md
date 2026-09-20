# Mobile design

Etu follows Material 3 layout conventions with Nord-inspired color accents. Appearance follows the device, including changes while the app is open.

- `src/theme/index.ts` owns semantic color pairs. Dark backgrounds are intentionally darker than standard Nord; secondary text remains readable rather than fading into the surface.
- Use `useAppTheme()` for props and `useThemedStyles(createStyles)` for styles. Keep factories outside components. Use `onPrimary` on filled buttons and `onPrimaryContainer` on tonal controls.
- Navigation, native launch surfaces, Markdown, dialogs, and attachment controls use the same appearance. Native launch colors live in Android's `values`/`values-night` resources and iOS's named color assets.
- The bottom bar contains Timeline, Random, Search, and Settings. New note opens the Capture stack screen; `etu://open/capture` remains supported.
- Interactive controls target at least 48dp; passive tag labels may be smaller. Lists reserve space for the floating action button. The button hides while the keyboard is open.
- Icons use local SVG paths through `react-native-svg`, not icon fonts. After installing dependencies, rebuild the native app; on iOS, install CocoaPods dependencies first.

## Device review

Check light/dark appearance changes, large system text, TalkBack/VoiceOver, gesture and three-button navigation, and keyboard handling. Exercise Capture → editor → save, note detail/edit, search filters, refresh/pagination, and all documented deep links. Verify dark launch and screen transitions do not flash a light background.

### Android verification (2026-09-20)

Built and ran the debug app on the Android 17 ARM64 emulator. Visually checked login and timeline in both appearances, live theme switching, SVG navigation/attachment icons, Capture → editor, editor keyboard entry, Search filters, Random, Settings, and note detail. Checked list cards and bottom navigation at 150% system font size. Note creation was not submitted during this visual review.

On this Mac, the native build succeeds using Homebrew JDK 21. Android Studio's bundled runtime fails during Prefab/CMake configuration with a restricted-method error. From `android/`:

```sh
JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home" \
ANDROID_HOME="$HOME/Library/Android/sdk" \
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

iOS device review, screen-reader interaction, and three-button Android navigation remain to be checked.
