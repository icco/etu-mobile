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

export default function ApiKeysScreen() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [, setRawKeyShown] = useState<string | null>(null);

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
      setRawKeyShown(rawKey);
      Alert.alert(
        'API key created',
        `Copy it now – you won't see it again.\n\n${rawKey}`,
        [{ text: 'OK', onPress: () => setRawKeyShown(null) }]
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create key');
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
              .then(() => queryClient.invalidateQueries({ queryKey: ['apiKeys', user.id] }))
              .catch(() => {});
            void p;
          },
        },
      ]
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
        <ActivityIndicator size="large" color="#0a84ff" style={styles.loader} />
      ) : (
        <FlatList
          data={keys}
          keyExtractor={(item) => item.id}
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
            <Text style={styles.empty}>No API keys. Create one to use the CLI or sign in here.</Text>
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
              placeholderTextColor="#666"
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setModalVisible(false); setNewName(''); }}
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
                  <ActivityIndicator color="#fff" size="small" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 16 },
  addBtn: {
    backgroundColor: '#0a84ff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loader: { marginTop: 24 },
  list: { paddingBottom: 32 },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  keyInfo: { flex: 1 },
  keyName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  keyPrefix: { color: '#666', fontSize: 13, marginTop: 4 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { color: '#ff453a', fontSize: 14 },
  empty: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: { backgroundColor: '#1c1c1e', borderRadius: 12, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 16 },
  input: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalCancel: { padding: 12 },
  modalCancelText: { color: '#888', fontSize: 16 },
  modalCreate: {
    backgroundColor: '#0a84ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalCreateText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.7 },
});
