import { useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import type { Theme } from '@react-navigation/native';

// Nord-inspired accents on darker, neutral surfaces. Text pairs meet WCAG AA.
export const darkColors = {
  background: '#0D1117',
  surface: '#171D26',
  surfaceRaised: '#222B38',
  outline: '#3E4B5D',
  text: '#ECEFF4',
  textSecondary: '#ADB8C8',
  primary: '#88C0D0',
  onPrimary: '#102D38',
  primaryContainer: '#253F4B',
  onPrimaryContainer: '#BCE7F2',
  error: '#F0A0A8',
  onError: '#40171D',
  success: '#A3BE8C',
  ripple: '#88C0D026',
  scrim: 'rgba(0, 0, 0, 0.72)',
};

export type Colors = { [Key in keyof typeof darkColors]: string };

export const lightColors: Colors = {
  background: '#ECEFF4',
  surface: '#FFFFFF',
  surfaceRaised: '#E5E9F0',
  outline: '#7D8999',
  text: '#2E3440',
  textSecondary: '#4C566A',
  primary: '#356579',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D2E8EF',
  onPrimaryContainer: '#234C5C',
  error: '#A33242',
  onError: '#FFFFFF',
  success: '#466635',
  ripple: '#35657920',
  scrim: 'rgba(13, 17, 23, 0.56)',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const shape = { small: 8, medium: 16, large: 24, pill: 999 };

export function navigationTheme(dark: boolean): Theme {
  const colors = dark ? darkColors : lightColors;
  const fontFamily = Platform.OS === 'android' ? 'sans-serif' : 'System';
  return {
    dark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.outline,
      notification: colors.error,
    },
    fonts: {
      regular: { fontFamily, fontWeight: '400' },
      medium: { fontFamily, fontWeight: '500' },
      bold: { fontFamily, fontWeight: '600' },
      heavy: { fontFamily, fontWeight: '700' },
    },
  };
}

export function useAppTheme() {
  const dark = useColorScheme() === 'dark';
  return useMemo(
    () => ({
      dark,
      colors: dark ? darkColors : lightColors,
      navigation: navigationTheme(dark),
    }),
    [dark],
  );
}

export function useThemedStyles<T>(factory: (colors: Colors) => T): T {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
