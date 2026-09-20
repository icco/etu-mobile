import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listNotes, listTags } from '../api/notes';
import NoteCard from '../components/NoteCard';
import type { Note } from '../api/client';
import { protoTimestampToDate, formatDateGroup } from '../utils/date';
import { isAuthError, getErrorMessage } from '../utils/errors';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';
import Icon from '../components/Icon';
import NewNoteButton from '../components/NewNoteButton';

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

export default function SearchScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const navigation = useNavigation();
  const { user, token, handleAuthError } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: tagList = [], error: tagsError } = useQuery({
    queryKey: ['tags', user?.id],
    queryFn: () => listTags(user!.id, token!),
    enabled: !!user?.id && !!token,
  });

  // Handle auth errors for tags query
  React.useEffect(() => {
    if (tagsError && isAuthError(tagsError)) {
      void handleAuthError();
    }
  }, [tagsError, handleAuthError]);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'notesSearch',
      user?.id,
      search,
      selectedTags,
      startDate,
      endDate,
    ],
    queryFn: () =>
      listNotes({
        userId: user!.id,
        token: token!,
        search: search.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 100,
      }),
    enabled: !!user?.id && !!token,
  });

  // Handle auth errors for notes query
  React.useEffect(() => {
    if (error && isAuthError(error)) {
      void handleAuthError();
    }
  }, [error, handleAuthError]);

  const grouped = useMemo(() => {
    if (!data?.notes) return [];
    return groupNotesByDate(data.notes);
  }, [data]);

  const sections = useMemo(() => {
    return grouped.flatMap(g => [
      { type: 'header' as const, key: g.label, label: g.label },
      ...g.notes.map(n => ({ type: 'note' as const, key: n.id, note: n })),
    ]);
  }, [grouped]);

  const toggleTag = (name: string) => {
    setSelectedTags(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name],
    );
  };

  if (!user || !token) return null;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="search" color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Search notes"
          selectionColor={colors.primary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.iconButton}
            onPress={() => setSearch('')}
          >
            <Icon name="close" color={colors.textSecondary} />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search filters"
          accessibilityState={{ expanded: filtersVisible }}
          style={styles.iconButton}
          onPress={() => setFiltersVisible(!filtersVisible)}
        >
          <Icon
            name="filter"
            color={
              filtersVisible || selectedTags.length > 0 || startDate || endDate
                ? colors.primary
                : colors.textSecondary
            }
          />
        </Pressable>
      </View>
      {filtersVisible && (
        <ScrollView style={styles.filters} keyboardShouldPersistTaps="handled">
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Filter by tag</Text>
            <View style={styles.tagRow}>
              {tagList.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(t.name) && styles.tagChipSelected,
                  ]}
                  onPress={() => toggleTag(t.name)}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: selectedTags.includes(t.name),
                  }}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      selectedTags.includes(t.name) &&
                        styles.tagChipTextSelected,
                    ]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              placeholder="Start (YYYY-MM-DD)"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Start date, YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
            />
            <TextInput
              style={styles.dateInput}
              placeholder="End (YYYY-MM-DD)"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="End date, YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </ScrollView>
      )}
      {(selectedTags.length > 0 || !!startDate || !!endDate) && (
        <Pressable
          accessibilityRole="button"
          style={styles.clearFilters}
          onPress={() => {
            setSelectedTags([]);
            setStartDate('');
            setEndDate('');
          }}
        >
          <Text style={styles.clearText}>
            Clear filters ·{' '}
            {selectedTags.length + Number(!!startDate) + Number(!!endDate)}{' '}
            active
          </Text>
        </Pressable>
      )}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Error loading notes</Text>
          <Text style={styles.errorDetail}>{getErrorMessage(error)}</Text>
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          data={sections}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.list}
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
              <Text style={styles.emptyText}>No notes match</Text>
            </View>
          }
        />
      )}
      <NewNoteButton />
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceRaised,
      borderRadius: 28,
      margin: 16,
      paddingLeft: 16,
      paddingRight: 4,
      minHeight: 56,
    },
    iconButton: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filters: { maxHeight: 240, flexGrow: 0 },
    clearFilters: {
      minHeight: 48,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    clearText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    searchInput: {
      flex: 1,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    filterRow: { marginHorizontal: 16, marginBottom: 8 },
    filterLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagChip: {
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 48,
      justifyContent: 'center',
      borderRadius: 12,
    },
    tagChipSelected: { backgroundColor: colors.primary },
    tagChipText: { color: colors.text, fontSize: 14 },
    tagChipTextSelected: { color: colors.onPrimary, fontWeight: '600' },
    dateRow: {
      flexDirection: 'row',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    dateInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      minHeight: 56,
      padding: 12,
      fontSize: 14,
      color: colors.text,
    },
    list: { paddingBottom: 96 },
    sectionHeader: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 6,
      marginHorizontal: 24,
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { padding: 48, alignItems: 'center' },
    emptyText: { color: colors.textSecondary, fontSize: 16 },
    errorDetail: {
      color: colors.error,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
  });
