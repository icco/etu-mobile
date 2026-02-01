import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NoteEdit'>;

export default function CaptureScreen() {
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
      keyboardVerticalOffset={100}
    >
      <TextInput
        style={styles.input}
        placeholder="Quick capture…"
        placeholderTextColor="#666"
        value={quickText}
        onChangeText={setQuickText}
        multiline
        textAlignVertical="top"
        onSubmitEditing={handleCapture}
      />
      <TouchableOpacity
        style={[styles.button, !quickText.trim() && styles.buttonSecondary]}
        onPress={handleCapture}
      >
        <Text style={styles.buttonText}>
          {quickText.trim() ? 'Capture & edit' : 'New note'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    padding: 16,
    justifyContent: 'flex-start',
  },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 120,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0a84ff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
