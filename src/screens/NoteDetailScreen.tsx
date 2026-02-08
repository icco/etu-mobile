import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getNote, deleteNote } from '../api/notes';
import MarkdownView from '../components/MarkdownView';
import { protoTimestampToDate } from '../utils/date';
import { isAuthError, getErrorMessage } from '../utils/errors';

type Params = { noteId: string };

export default function NoteDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const noteId = route.params?.noteId;
  const queryClient = useQueryClient();
  const { user, token, handleAuthError } = useAuth();

  const { data: note, isLoading, error } = useQuery({
    queryKey: ['note', noteId, user?.id],
    queryFn: () => getNote(user!.id, token!, noteId),
    enabled: !!user?.id && !!token && !!noteId,
  });

  // Handle auth errors
  React.useEffect(() => {
    if (error && isAuthError(error)) {
      void handleAuthError();
    }
  }, [error, handleAuthError]);

  const handleDelete = () => {
    if (!noteId || !user || !token) return;
    Alert.alert(
      'Delete note',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(user.id, token, noteId);
            queryClient.invalidateQueries({ queryKey: ['notes', user.id] });
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    (navigation as { navigate: (name: string, params?: object) => void }).navigate('NoteEdit', { noteId, note });
  };

  if (!user || !token || !noteId) return null;
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );
  }
  if (error || !note) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Failed to load note</Text>
        <Text style={styles.errorDetail}>{error ? getErrorMessage(error) : 'Note not found'}</Text>
      </View>
    );
  }

  const created = protoTimestampToDate(note.createdAt);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.meta}>
        <Text style={styles.date}>
          {created.toLocaleDateString()} · {created.toLocaleTimeString()}
        </Text>
        {note.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {note.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>{tag}</Text>
            ))}
          </View>
        ) : null}
      </View>
      <MarkdownView content={note.content} />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  error: { color: '#ff453a', fontSize: 16 },
  errorDetail: { color: '#888', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  meta: { marginBottom: 16 },
  date: { color: '#666', fontSize: 13 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  tag: {
    backgroundColor: '#333',
    color: '#0a84ff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  editBtn: {
    backgroundColor: '#0a84ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  editBtnText: { color: '#fff', fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  deleteBtnText: { color: '#ff453a', fontWeight: '600' },
});
