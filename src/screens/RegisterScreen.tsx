import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Register', 'Enter email and password');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Register', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Register', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
      Alert.alert(
        'Account created',
        'Create an API key in Etu web Settings and sign in with it here, or use Email sign-in if your backend supports it.',
      );
    } catch (e) {
      Alert.alert(
        'Register',
        e instanceof Error ? e.message : 'Registration failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Register for Etu</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Password, at least 8 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => {
            void handleRegister();
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      paddingVertical: 48,
    },
    title: {
      fontSize: 30,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 32,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      minHeight: 56,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 28,
      minHeight: 56,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  });
