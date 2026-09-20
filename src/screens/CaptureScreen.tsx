import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';
import Icon from '../components/Icon';
import { useHeaderHeight } from '@react-navigation/elements';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NoteEdit'>;

export default function CaptureScreen() {
  const { colors, dark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const [quickText, setQuickText] = useState('');

  const handleCapture = () => {
    const trimmed = quickText.trim();
    navigation.navigate('NoteEdit', { initialContent: trimmed || undefined });
    setQuickText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.symbol}>
          <Icon name="timeline" size={32} color={colors.onPrimaryContainer} />
        </View>
        <Text style={styles.title}>Keep a little of today.</Text>
        <Text style={styles.subtitle}>
          A passing thought. Something you noticed. Start anywhere.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="What’s on your mind?"
          accessibilityLabel="Quick capture"
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          keyboardAppearance={dark ? 'dark' : 'light'}
          value={quickText}
          onChangeText={setQuickText}
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={handleCapture}
        >
          <Text style={styles.buttonText}>
            {quickText.trim() ? 'Continue to editor' : 'Open editor'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Add tags, photos, and audio in the editor.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'flex-start',
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      fontSize: 18,
      lineHeight: 28,
      color: colors.text,
      minHeight: 200,
      marginBottom: 16,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 28,
      alignItems: 'center',
    },
    content: { padding: 24, flexGrow: 1 },
    symbol: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      lineHeight: 38,
      fontWeight: '600',
      marginBottom: 12,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 28,
    },
    hint: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 16,
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
  });
