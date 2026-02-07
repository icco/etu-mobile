import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getRandomNotes } from '../api/notes';
import NoteCard from '../components/NoteCard';
import type { Note } from '../api/client';

const RANDOM_COUNT = 5;

export default function RandomScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { data: notes = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['randomNotes', user?.id],
    queryFn: () => getRandomNotes(user!.id, token!, RANDOM_COUNT),
    enabled: !!user?.id && !!token,
  });

  if (!user || !token) return null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );
  }

  return (
    <FlatList
      data={notes as Note[]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.header}>
          Resurface – {notes.length} random note{notes.length !== 1 ? 's' : ''} from your past
        </Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isLoading}
          onRefresh={refetch}
          tintColor="#0a84ff"
        />
      }
      renderItem={({ item }) => (
        <NoteCard
          note={item}
          onPress={() =>
            (navigation as { navigate: (name: string, params?: object) => void }).navigate('NoteDetail', { noteId: item.id })
          }
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptyHint}>Add notes in Capture or Timeline</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  list: { paddingVertical: 8, paddingBottom: 32 },
  header: {
    color: '#888',
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18 },
  emptyHint: { color: '#666', fontSize: 14, marginTop: 8 },
});
