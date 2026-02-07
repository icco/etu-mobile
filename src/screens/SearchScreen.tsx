import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listNotes, listTags } from '../api/notes';
import NoteCard from '../components/NoteCard';
import type { Note } from '../api/client';
import type { Tag } from '../api/client';
import { protoTimestampToDate, formatDateGroup } from '../utils/date';

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

export default function SearchScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: tagList = [] } = useQuery({
    queryKey: ['tags', user?.id],
    queryFn: () => listTags(user!.id, token!),
    enabled: !!user?.id && !!token,
  });

  const { data, isLoading } = useQuery({
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

  const grouped = useMemo(() => {
    if (!data?.notes) return [];
    return groupNotesByDate(data.notes);
  }, [data?.notes]);

  const sections = useMemo(() => {
    return grouped.flatMap((g) => [
      { type: 'header' as const, key: g.label, label: g.label },
      ...g.notes.map((n) => ({ type: 'note' as const, key: n.id, note: n })),
    ]);
  }, [grouped]);

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  if (!user || !token) return null;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search notes…"
        placeholderTextColor="#666"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Tags:</Text>
        <View style={styles.tagRow}>
          {(tagList as Tag[]).slice(0, 10).map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tagChip,
                selectedTags.includes(t.name) && styles.tagChipSelected,
              ]}
              onPress={() => toggleTag(t.name)}
            >
              <Text
                style={[
                  styles.tagChipText,
                  selectedTags.includes(t.name) && styles.tagChipTextSelected,
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
          placeholderTextColor="#666"
          value={startDate}
          onChangeText={setStartDate}
        />
        <TextInput
          style={styles.dateInput}
          placeholder="End (YYYY-MM-DD)"
          placeholderTextColor="#666"
          value={endDate}
          onChangeText={setEndDate}
        />
      </View>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0a84ff" />
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
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
              <Text style={styles.emptyText}>No notes match</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  searchInput: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    margin: 16,
    marginBottom: 8,
  },
  filterRow: { marginHorizontal: 16, marginBottom: 8 },
  filterLabel: { color: '#888', fontSize: 13, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagChipSelected: { backgroundColor: '#0a84ff' },
  tagChipText: { color: '#fff', fontSize: 14 },
  tagChipTextSelected: { color: '#fff', fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  dateInput: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
  },
  list: { paddingBottom: 32 },
  sectionHeader: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
});
