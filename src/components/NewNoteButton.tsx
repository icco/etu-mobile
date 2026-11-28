import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from '../navigation/types';
import { useAppTheme } from '../theme';
import Icon, { type IconName } from './Icon';

const entries: {
  label: string;
  icon: IconName;
  attach?: RootStackParamList['NoteEdit']['attach'];
}[] = [
  { label: 'Text', icon: 'edit' },
  { label: 'Voice', icon: 'audio', attach: 'audio' },
  { label: 'Photo', icon: 'image', attach: 'images' },
];

export default function NewNoteButton() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
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
    <>
      {open ? (
        <Pressable
          accessibilityLabel="Close new note menu"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={() => setOpen(false)}
        />
      ) : null}
      <View style={styles.column} pointerEvents="box-none">
        {open
          ? entries.map(entry => (
              <Pressable
                key={entry.label}
                accessibilityRole="button"
                accessibilityLabel={`New ${entry.label.toLowerCase()} note`}
                android_ripple={{ color: colors.ripple }}
                onPress={() => {
                  setOpen(false);
                  navigation.navigate(
                    'NoteEdit',
                    entry.attach ? { attach: entry.attach } : {},
                  );
                }}
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: colors.primaryContainer,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Icon name={entry.icon} color={colors.onPrimaryContainer} />
                <Text
                  style={[styles.label, { color: colors.onPrimaryContainer }]}
                >
                  {entry.label}
                </Text>
              </Pressable>
            ))
          : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Close new note menu' : 'New note'}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          android_ripple={{ color: colors.ripple }}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: open ? colors.primary : colors.primaryContainer,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Icon
            name={open ? 'close' : 'add'}
            color={open ? colors.onPrimary : colors.onPrimaryContainer}
          />
          {open ? null : (
            <Text style={[styles.label, { color: colors.onPrimaryContainer }]}>
              New note
            </Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

const shadow = {
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 6,
  overflow: 'hidden',
} as const;

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  item: {
    ...shadow,
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    ...shadow,
    minHeight: 56,
    minWidth: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  label: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1 },
});
