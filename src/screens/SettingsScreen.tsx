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
  BackHandler,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getUserSettings, updateUserSettings } from '../api/settings';
import { getStats } from '../api/stats';
import type { Stats } from '../api/stats';
import { getErrorMessage } from '../utils/errors';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ApiKeysScreen from './ApiKeysScreen';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';

export default function SettingsScreen() {
  const { colors, dark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user, token, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<
    'main' | 'apikeys' | 'stats'
  >('main');
  useFocusEffect(
    React.useCallback(() => {
      if (activeSection === 'main') return;
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          setActiveSection('main');
          return true;
        },
      );
      return () => subscription.remove();
    }, [activeSection]),
  );
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  // Track the last server-provided name we hydrated into the editable
  // `name` field so we re-sync only when the upstream value actually
  // changes. Avoids react-hooks/set-state-in-effect; see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [hydratedName, setHydratedName] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: () => getUserSettings(user!.id, token!),
    enabled: !!user?.id && !!token && activeSection === 'main',
  });

  const userStatsQuery = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: () => getStats(token!, user!.id),
    enabled: !!user?.id && !!token && activeSection === 'stats',
  });

  const globalStatsQuery = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: () => getStats(token!),
    enabled: !!token && activeSection === 'stats',
  });

  if (profile?.name && profile.name !== hydratedName) {
    setHydratedName(profile.name);
    setName(profile.name);
  }

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
      void queryClient.invalidateQueries({
        queryKey: ['userSettings', user.id],
      });
      void refreshUser();
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

  const renderStatsBlock = (
    title: string,
    query: { data?: Stats; isLoading: boolean; error: unknown },
    spaced: boolean,
  ) => (
    <>
      <Text style={[styles.sectionTitle, spaced && styles.sectionTitleSpaced]}>
        {title}
      </Text>
      {query.isLoading ? (
        <ActivityIndicator
          testID="stats-loader"
          size="small"
          color={colors.primary}
          style={styles.loader}
        />
      ) : query.error ? (
        <>
          <Text style={styles.errorText}>Failed to load stats</Text>
          <Text style={styles.errorDetail}>{getErrorMessage(query.error)}</Text>
        </>
      ) : (
        <View style={styles.statsCard}>
          <Text style={styles.label}>Blips</Text>
          <Text style={styles.value}>
            {query.data ? query.data.totalBlips.toLocaleString() : '—'}
          </Text>
          <Text style={styles.label}>Tags</Text>
          <Text style={styles.value}>
            {query.data ? query.data.uniqueTags.toLocaleString() : '—'}
          </Text>
          <Text style={styles.label}>Words written</Text>
          <Text style={styles.value}>
            {query.data ? query.data.wordsWritten.toLocaleString() : '—'}
          </Text>
        </View>
      )}
    </>
  );

  if (activeSection === 'stats') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setActiveSection('main')}
        >
          <Text style={styles.backBtnText}>← Settings</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scroll}>
          {renderStatsBlock('Your Statistics', userStatsQuery, false)}
          {renderStatsBlock('Community Statistics', globalStatsQuery, true)}
        </ScrollView>
      </View>
    );
  }

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.accountCard}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loader}
          />
        ) : (
          <>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Your name"
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>New password (leave blank to keep)</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.disabled]}
              onPress={() => {
                void handleUpdateProfile();
              }}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save profile</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        Appearance
      </Text>
      <View style={styles.appearanceRow}>
        <Text style={styles.value}>Follow device</Text>
        <Text style={styles.hint}>{dark ? 'Dark' : 'Light'} theme</Text>
      </View>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        Statistics
      </Text>
      <Text style={styles.hint}>
        See your journaling activity and community totals.
      </Text>
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => setActiveSection('stats')}
      >
        <Text style={styles.linkBtnText}>View statistics →</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        API Keys
      </Text>
      <Text style={styles.hint}>
        Create keys to use the Etu CLI or sign in on this app with “API key”.
      </Text>
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => setActiveSection('apikeys')}
      >
        <Text style={styles.linkBtnText}>Manage API keys →</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        Subscription
      </Text>
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => {
          void Linking.openURL('https://etu.timeclimbers.com/settings');
        }}
      >
        <Text style={styles.linkBtnText}>Manage subscription (web) →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          void logout();
        }}
      >
        <Text style={styles.logoutBtnText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, paddingBottom: 48 },
    accountCard: {
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.surface,
    },
    statsCard: {
      padding: 24,
      borderRadius: 24,
      backgroundColor: colors.surface,
    },
    appearanceRow: {
      padding: 20,
      paddingBottom: 4,
      borderRadius: 16,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
    },
    backBtn: { padding: 16, minHeight: 48 },
    backBtnText: { color: colors.primary, fontSize: 16 },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
    value: { color: colors.text, fontSize: 16, marginBottom: 16 },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 12,
      minHeight: 56,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    loader: { marginVertical: 16 },
    saveBtn: {
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 28,
      minHeight: 48,
      alignItems: 'center',
      marginTop: 8,
    },
    disabled: { opacity: 0.7 },
    saveBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
    hint: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 12,
    },
    errorText: { color: colors.error, fontSize: 16, marginBottom: 4 },
    errorDetail: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 16,
    },
    linkBtn: {
      marginBottom: 8,
      minHeight: 56,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      justifyContent: 'center',
    },
    linkBtnText: { color: colors.primary, fontSize: 16 },
    sectionTitleSpaced: { marginTop: 32 },
    logoutBtn: {
      marginTop: 32,
      padding: 16,
      borderRadius: 28,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
    },
    logoutBtnText: { color: colors.error, fontSize: 16, fontWeight: '600' },
  });
