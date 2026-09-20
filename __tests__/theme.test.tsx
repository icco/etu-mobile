import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import {
  darkColors,
  lightColors,
  useAppTheme,
  useThemedStyles,
} from '../src/theme';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const scheme = jest.mocked(useColorScheme);

function luminance(hex: string) {
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

describe.each([
  ['dark', darkColors],
  ['light', lightColors],
] as const)('%s theme', (_, colors) => {
  it('keeps normal, secondary, accent, and error text at AA contrast on every surface', () => {
    const pairs = [
      ...[colors.background, colors.surface, colors.surfaceRaised].flatMap(
        background =>
          [colors.text, colors.textSecondary, colors.primary, colors.error].map(
            text => [text, background],
          ),
      ),
      [colors.onPrimary, colors.primary],
      [colors.onPrimaryContainer, colors.primaryContainer],
      [colors.onError, colors.error],
    ];
    for (const [foreground, background] of pairs) {
      const a = luminance(foreground);
      const b = luminance(background);
      expect(
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

it('updates component and navigation surfaces together when the device appearance changes', async () => {
  scheme.mockReturnValue('light');
  const factory = (colors: typeof lightColors) => ({
    backgroundColor: colors.background,
  });
  const { result, rerender } = await renderHook(() => ({
    theme: useAppTheme(),
    styles: useThemedStyles(factory),
  }));
  expect(result.current.styles.backgroundColor).toBe(lightColors.background);
  scheme.mockReturnValue('dark');
  await rerender({});
  expect(result.current.theme.navigation.dark).toBe(true);
  expect(result.current.theme.navigation.colors.background).toBe(
    darkColors.background,
  );
  expect(result.current.styles.backgroundColor).toBe(darkColors.background);
});
