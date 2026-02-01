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

type Mode = 'key' | 'email';

export default function LoginScreen() {
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
      Alert.alert(
        'Login',
        e instanceof Error ? e.message : 'Login failed'
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
        <Text style={styles.title}>Etu</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.tab, mode === 'key' && styles.tabActive]}
            onPress={() => setMode('key')}
          >
            <Text style={[styles.tabText, mode === 'key' && styles.tabTextActive]}>
              API Key
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'email' && styles.tabActive]}
            onPress={() => setMode('email')}
          >
            <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>
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
              placeholderTextColor="#888"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLoginWithKey}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
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
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLoginWithEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate('Register' as never)}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 80,
  },
  title: { fontSize: 32, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 8 },
  toggle: { flexDirection: 'row', marginTop: 24, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  tabActive: { borderBottomColor: '#0a84ff' },
  tabText: { color: '#888', fontSize: 16 },
  tabTextActive: { color: '#0a84ff', fontWeight: '600' },
  error: { color: '#ff453a', marginBottom: 12, fontSize: 14 },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0a84ff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#0a84ff', fontSize: 16 },
  hint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
