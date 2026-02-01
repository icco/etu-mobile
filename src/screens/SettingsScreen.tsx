import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getUserSettings, updateUserSettings } from '../api/settings';
import { listNotes } from '../api/notes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ApiKeysScreen from './ApiKeysScreen';

export default function SettingsScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'main' | 'apikeys'>('main');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: () => getUserSettings(user!.id, token!),
    enabled: !!user?.id && !!token && activeSection === 'main',
  });

  const { data: noteStats } = useQuery({
    queryKey: ['noteStats', user?.id],
    queryFn: () => listNotes({ userId: user!.id, token: token!, limit: 1, offset: 0 }),
    enabled: !!user?.id && !!token && activeSection === 'main',
  });

  React.useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const handleUpdateProfile = async () => {
    if (!user || !token) return;
    const updates: { name?: string; password?: string } = {};
    if (name.trim() !== (profile?.name ?? '')) updates.name = name.trim();
    if (password) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters');
        return;
      }
      updates.password = password;
    }
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    try {
      await updateUserSettings(user.id, token, updates);
      queryClient.invalidateQueries({ queryKey: ['userSettings', user.id] });
      refreshUser();
      setPassword('');
      setConfirmPassword('');
      Alert.alert('Saved', 'Profile updated');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!user || !token) return null;

  if (activeSection === 'apikeys') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setActiveSection('main')}
        >
          <Text style={styles.backBtnText}>← Settings</Text>
        </TouchableOpacity>
        <ApiKeysScreen />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.sectionTitle}>Account</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color="#0a84ff" style={styles.loader} />
      ) : (
        <>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>New password (leave blank to keep)</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.disabled]}
            onPress={handleUpdateProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save profile</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Usage</Text>
      <Text style={styles.label}>Notes</Text>
      <Text style={styles.value}>
        {noteStats?.total != null ? noteStats.total.toLocaleString() : '—'}
      </Text>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>API Keys</Text>
      <Text style={styles.hint}>
        Create keys to use the Etu CLI or sign in on this app with “API key”.
      </Text>
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => setActiveSection('apikeys')}
      >
        <Text style={styles.linkBtnText}>Manage API keys →</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Subscription</Text>
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => Linking.openURL('https://etu.natwelch.com/settings')}
      >
        <Text style={styles.linkBtnText}>Manage subscription (web) →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  scroll: { padding: 24, paddingBottom: 48 },
  backBtn: { padding: 16, paddingTop: 8 },
  backBtnText: { color: '#0a84ff', fontSize: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  label: { color: '#888', fontSize: 13, marginBottom: 4 },
  value: { color: '#fff', fontSize: 16, marginBottom: 16 },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  loader: { marginVertical: 16 },
  saveBtn: {
    backgroundColor: '#0a84ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { color: '#666', fontSize: 14, marginBottom: 12 },
  linkBtn: { marginBottom: 8 },
  linkBtnText: { color: '#0a84ff', fontSize: 16 },
  sectionTitleSpaced: { marginTop: 32 },
  logoutBtn: {
    marginTop: 32,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  logoutBtnText: { color: '#ff453a', fontSize: 16, fontWeight: '600' },
});
