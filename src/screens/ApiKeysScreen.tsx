import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listApiKeys, createApiKey, deleteApiKey } from '../api/settings';
import type { ApiKey } from '../api/client';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';

export default function ApiKeysScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['apiKeys', user?.id],
    queryFn: () => listApiKeys(user!.id, token!),
    enabled: !!user?.id && !!token,
  });

  const handleCreate = async () => {
    if (!user || !token || !newName.trim()) return;
    setCreating(true);
    try {
      const { rawKey } = await createApiKey(user.id, token, newName.trim());
      void queryClient.invalidateQueries({ queryKey: ['apiKeys', user.id] });
      setModalVisible(false);
      setNewName('');
      Alert.alert(
        'API key created',
        `Copy it now – you won't see it again.\n\n${rawKey}`,
      );
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to create key',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (key: ApiKey) => {
    if (!user || !token) return;
    Alert.alert(
      'Delete API key',
      `Delete "${key.name}" (…${key.keyPrefix})? Apps using this key will stop working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const p = deleteApiKey(user.id, token, key.id)
              .then(() =>
                queryClient.invalidateQueries({
                  queryKey: ['apiKeys', user.id],
                }),
              )
              .catch(() => {});
            void p;
          },
        },
      ],
    );
  };

  if (!user || !token) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addBtnText}>Create API key</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={keys}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.keyRow}>
              <View style={styles.keyInfo}>
                <Text style={styles.keyName}>{item.name}</Text>
                <Text style={styles.keyPrefix}>…{item.keyPrefix}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  handleDelete(item);
                }}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No API keys. Create one to use the CLI or sign in here.
            </Text>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New API key</Text>
            <TextInput
              style={styles.input}
              placeholder="Name (e.g. CLI, Etu mobile)"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="API key name"
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setModalVisible(false);
                  setNewName('');
                }}
                disabled={creating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, creating && styles.disabled]}
                onPress={() => {
                  void handleCreate();
                }}
                disabled={creating || !newName.trim()}
              >
                {creating ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    addBtn: {
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 28,
      minHeight: 48,
      alignItems: 'center',
      marginBottom: 16,
    },
    addBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
    loader: { marginTop: 24 },
    list: { paddingBottom: 32 },
    keyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      marginBottom: 8,
    },
    keyInfo: { flex: 1 },
    keyName: { color: colors.text, fontSize: 16, fontWeight: '600' },
    keyPrefix: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
    deleteBtn: { padding: 12, minHeight: 48, justifyContent: 'center' },
    deleteBtnText: { color: colors.error, fontSize: 14 },
    empty: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
      marginTop: 24,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: 24,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 24,
    },
    input: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text,
      marginBottom: 20,
    },
    modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
    modalCancel: { padding: 12, minHeight: 48, justifyContent: 'center' },
    modalCancelText: { color: colors.primary, fontSize: 16 },
    modalCreate: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      minHeight: 48,
      justifyContent: 'center',
    },
    modalCreateText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    disabled: { opacity: 0.7 },
  });
