import React, { useState } from 'react';
import {
  View,
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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';

type Mode = 'key' | 'email';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { loginWithKey, login } = useAuth();
  const [mode, setMode] = useState<Mode>('key');
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginWithKey = async () => {
    if (!apiKey.trim()) {
      setError('Enter your API key');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginWithKey(apiKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithEmail = async () => {
    if (!email.trim() || !password) {
      setError('Enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert('Login', e instanceof Error ? e.message : 'Login failed');
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
        <Text style={styles.title}>Etu</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.tab, mode === 'key' && styles.tabActive]}
            onPress={() => setMode('key')}
          >
            <Text
              style={[styles.tabText, mode === 'key' && styles.tabTextActive]}
            >
              API Key
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'email' && styles.tabActive]}
            onPress={() => setMode('email')}
          >
            <Text
              style={[styles.tabText, mode === 'email' && styles.tabTextActive]}
            >
              Email
            </Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {mode === 'key' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Paste your API key (from Etu web Settings)"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="API key"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={() => {
                void handleLoginWithKey();
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>Sign in with API key</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
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
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={() => {
                void handleLoginWithEmail();
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.link}
          onPress={() =>
            (
              navigation as {
                navigate: (name: string, params?: object) => void;
              }
            ).navigate('Register')
          }
        >
          <Text style={styles.linkText}>Create an account</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Get an API key from Etu web app → Settings → API Keys
        </Text>
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
      fontSize: 48,
      fontWeight: '600',
      letterSpacing: -2,
      color: colors.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    toggle: {
      flexDirection: 'row',
      marginTop: 32,
      marginBottom: 24,
      borderRadius: 28,
      padding: 4,
      backgroundColor: colors.surfaceRaised,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
      borderRadius: 24,
    },
    tabActive: { backgroundColor: colors.primaryContainer },
    tabText: { color: colors.textSecondary, fontSize: 16 },
    tabTextActive: { color: colors.onPrimaryContainer, fontWeight: '600' },
    error: { color: colors.error, marginBottom: 12, fontSize: 14 },
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
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
    link: {
      marginTop: 16,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    linkText: { color: colors.primary, fontSize: 16 },
    hint: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 24,
      paddingHorizontal: 16,
    },
  });
