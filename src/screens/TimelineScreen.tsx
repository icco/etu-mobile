import React, { useMemo } from 'react';
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
import { listNotes } from '../api/notes';
import NoteCard from '../components/NoteCard';
import type { Note } from '../api/client';
import { protoTimestampToDate, formatDateGroup } from '../utils/date';
import { isAuthError, getErrorMessage } from '../utils/errors';

type GroupedNotes = { label: string; notes: Note[] }[];

function groupNotesByDate(notes: Note[]): GroupedNotes {
  const groups: Record<string, Note[]> = {};
  const sorted = [...notes].sort((a, b) => {
    const da = protoTimestampToDate(a.createdAt).getTime();
    const db = protoTimestampToDate(b.createdAt).getTime();
    return db - da;
  });
  for (const note of sorted) {
    const date = protoTimestampToDate(note.createdAt);
    const label = formatDateGroup(date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(note);
  }
  return Object.entries(groups).map(([label, groupNotes]) => ({ label, notes: groupNotes }));
}

export default function TimelineScreen() {
  const navigation = useNavigation();
  const { user, token, handleAuthError } = useAuth();
  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: () => listNotes({ userId: user!.id, token: token! }),
    enabled: !!user?.id && !!token,
  });

  // Handle auth errors
  React.useEffect(() => {
    if (error && isAuthError(error)) {
      void handleAuthError();
    }
  }, [error, handleAuthError]);

  const grouped = useMemo(() => {
    if (!data?.notes) return [];
    return groupNotesByDate(data.notes);
  }, [data?.notes]);

  if (!user || !token) return null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load notes</Text>
        <Text style={styles.errorDetail}>{getErrorMessage(error)}</Text>
      </View>
    );
  }

  const sections = grouped.flatMap((g) => [
    { type: 'header' as const, key: g.label, label: g.label },
    ...g.notes.map((n) => ({ type: 'note' as const, key: n.id, note: n })),
  ]);

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isLoading}
          onRefresh={refetch}
          tintColor="#0a84ff"
        />
      }
      renderItem={({ item }) => {
        if (item.type === 'header') {
          return <Text style={styles.sectionHeader}>{item.label}</Text>;
        }
        return (
          <NoteCard
            note={item.note}
            onPress={() =>
              (navigation as { navigate: (name: string, params?: object) => void }).navigate('NoteDetail', { noteId: item.note.id })
            }
          />
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptyHint}>Tap Capture to add one</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  list: { paddingVertical: 8, paddingBottom: 32 },
  sectionHeader: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 18 },
  emptyHint: { color: '#666', fontSize: 14, marginTop: 8 },
  errorText: { color: '#ff453a', fontSize: 18, marginBottom: 8 },
  errorDetail: { color: '#888', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
