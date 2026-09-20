import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listNotes } from '../api/notes';
import NoteCard from '../components/NoteCard';
import type { Note } from '../api/client';
import { protoTimestampToDate, formatDateGroup } from '../utils/date';
import { isAuthError, getErrorMessage } from '../utils/errors';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';
import NewNoteButton from '../components/NewNoteButton';

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
  return Object.entries(groups).map(([label, groupNotes]) => ({
    label,
    notes: groupNotes,
  }));
}

export default function TimelineScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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

  const allNotes = useMemo(
    () => (data?.pages ?? []).flatMap(p => p.notes),
    [data?.pages],
  );

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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && allNotes.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load notes</Text>
        <Text style={styles.errorDetail}>{getErrorMessage(error)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          style={styles.retry}
          android_ripple={{ color: colors.ripple }}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        <NewNoteButton />
      </View>
    );
  }

  const sections = grouped.flatMap(g => [
    { type: 'header' as const, key: g.label, label: g.label },
    ...g.notes.map(n => ({ type: 'note' as const, key: n.id, note: n })),
  ]);

  const isPullRefreshing = isFetching && !isFetchingNextPage && !isLoading;

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
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
                (
                  navigation as {
                    navigate: (name: string, params?: object) => void;
                  }
                ).navigate('NoteDetail', { noteId: item.note.id })
              }
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptyHint}>
              A thought, a photo, a moment. Tap New note to keep it here.
            </Text>
          </View>
        }
      />
      <NewNoteButton />
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    list: { paddingVertical: 8, paddingBottom: 96, flexGrow: 1 },
    footer: { paddingVertical: 16, alignItems: 'center' },
    sectionHeader: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 20,
      marginBottom: 6,
      marginHorizontal: 24,
      letterSpacing: 0.5,
    },
    empty: { padding: 48, alignItems: 'center' },
    emptyText: { color: colors.text, fontSize: 22, fontWeight: '600' },
    emptyHint: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 12,
      textAlign: 'center',
    },
    errorText: { color: colors.error, fontSize: 18, marginBottom: 8 },
    errorDetail: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    retry: {
      marginTop: 20,
      minHeight: 48,
      padding: 16,
      borderRadius: 24,
      backgroundColor: colors.primaryContainer,
    },
    retryText: { color: colors.onPrimaryContainer, fontWeight: '600' },
  });
