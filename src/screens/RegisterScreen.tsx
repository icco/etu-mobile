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

export default function RegisterScreen() {
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
        'Create an API key in Etu web Settings and sign in with it here, or use Email sign-in if your backend supports it.'
      );
    } catch (e) {
      Alert.alert(
        'Register',
        e instanceof Error ? e.message : 'Registration failed'
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
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#888"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>
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
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 8 },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    marginTop: 24,
  },
  button: {
    backgroundColor: '#0a84ff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
