import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../navigation/types';
import { useAppTheme } from '../theme';
import Icon from './Icon';

export default function NewNoteButton() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { colors } = useAppTheme();
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboardVisible) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New note"
      onPress={() => navigation.navigate('Capture')}
      android_ripple={{ color: colors.ripple }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.primaryContainer,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon name="add" color={colors.onPrimaryContainer} />
      <Text style={[styles.label, { color: colors.onPrimaryContainer }]}>
        New note
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  label: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1 },
});
