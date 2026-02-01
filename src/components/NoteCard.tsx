import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Note } from '../api/client';
import { protoTimestampToDate, formatDateGroup } from '../utils/date';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
}

export default function NoteCard({ note, onPress }: NoteCardProps) {
  const date = protoTimestampToDate(note.createdAt);
  const text = note.content ?? '';
  const preview = text.slice(0, 120) + (text.length > 120 ? '…' : '');
  const tags = note.tags ?? [];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.preview} numberOfLines={3}>{preview}</Text>
      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.slice(0, 5).map((tag) => (
            <Text key={tag} style={styles.tag}>{tag}</Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.date}>{formatDateGroup(date)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  preview: { color: '#fff', fontSize: 15, lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  tag: {
    backgroundColor: '#333',
    color: '#0a84ff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  date: { color: '#666', fontSize: 12, marginTop: 8 },
});
