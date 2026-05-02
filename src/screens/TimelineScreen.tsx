import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listNotes } from '../api/notes';
import NoteCard from '../components/NoteCard';
import type { Note } from '../api/client';
import { protoTimestampToDate, formatDateGroup } from '../utils/date';
import { isAuthError, getErrorMessage } from '../utils/errors';

const PAGE_SIZE = 50;

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
  const queryClient = useQueryClient();
  const { user, token, handleAuthError } = useAuth();

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ['notes', user?.id],
    queryFn: ({ pageParam }) =>
      listNotes({
        userId: user!.id,
        token: token!,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      const loaded = lastPage.offset + lastPage.notes.length;
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
    enabled: !!user?.id && !!token,
  });

  React.useEffect(() => {
    if (error && isAuthError(error)) {
      void handleAuthError();
    }
  }, [error, handleAuthError]);

  const allNotes = useMemo(() => (data?.pages ?? []).flatMap(p => p.notes), [data?.pages]);

  const grouped = useMemo(() => groupNotesByDate(allNotes), [allNotes]);

  const onRefresh = useCallback(() => {
    if (!user?.id) return;
    void queryClient.resetQueries({ queryKey: ['notes', user.id] });
  }, [queryClient, user]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!user || !token) return null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );
  }

  if (error && allNotes.length === 0) {
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

  const isPullRefreshing = isFetching && !isFetchingNextPage && !isLoading;

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={onRefresh}
          tintColor="#0a84ff"
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.35}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color="#0a84ff" />
          </View>
        ) : null
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
  footer: { paddingVertical: 16, alignItems: 'center' },
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
