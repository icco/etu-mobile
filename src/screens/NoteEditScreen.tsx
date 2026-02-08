import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getNote, createNote, updateNote, listTags } from '../api/notes';
import TagInput from '../components/TagInput';
import ImagePicker, { SelectedImage } from '../components/ImagePicker';
import AudioPicker, { SelectedAudio } from '../components/AudioPicker';
import type { Note } from '../api/client';

type Params = { noteId?: string; note?: Note; initialContent?: string };

export default function NoteEditScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const noteId = route.params?.noteId;
  const existingNote = route.params?.note;
  const initialContent = route.params?.initialContent;
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  const [content, setContent] = useState(initialContent ?? '');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [audios, setAudios] = useState<SelectedAudio[]>([]);
  const [saving, setSaving] = useState(false);

  const isEdit = !!noteId;

  useEffect(() => {
    if (initialContent !== undefined && !existingNote && !noteId) {
      setContent(initialContent);
    }
  }, [initialContent, existingNote, noteId]);

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', noteId, user?.id],
    queryFn: () => getNote(user!.id, token!, noteId!),
    enabled: isEdit && !!user?.id && !!token && !!noteId && !existingNote,
  });

  const { data: tagList = [] } = useQuery({
    queryKey: ['tags', user?.id],
    queryFn: () => listTags(user!.id, token!),
    enabled: !!user?.id && !!token,
  });

  useEffect(() => {
    if (existingNote) {
      setContent(existingNote.content);
      setTags(existingNote.tags ?? []);
    } else if (note) {
      setContent(note.content);
      setTags(note.tags ?? []);
    }
  }, [existingNote, note]);

  const handleSave = async () => {
    if (!user || !token) return;
    if (!content.trim()) {
      Alert.alert('Note', 'Add some content');
      return;
    }
    setSaving(true);
    try {
      // Prepare image uploads
      const imageUploads = images.map(img => ({
        data: img.data,
        mimeType: img.mimeType,
      }));

      // Prepare audio uploads
      const audioUploads = audios.map(audio => ({
        data: audio.data,
        mimeType: audio.mimeType,
      }));

      if (isEdit && noteId) {
        await updateNote(
          user.id,
          token,
          noteId,
          content.trim(),
          tags,
          true,
          imageUploads.length > 0 ? imageUploads : undefined,
          audioUploads.length > 0 ? audioUploads : undefined
        );
        void queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      } else {
        await createNote(
          user.id,
          token,
          content.trim(),
          tags,
          imageUploads.length > 0 ? imageUploads : undefined,
          audioUploads.length > 0 ? audioUploads : undefined
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['notes', user.id] });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!user || !token) return null;
  if (isEdit && !existingNote && isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0a84ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={[styles.input, styles.contentInput]}
          placeholder="Write in Markdown…"
          placeholderTextColor="#666"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.tagSection}>
          <TagInput
            selectedTags={tags}
            onTagsChange={setTags}
            suggestions={tagList}
          />
        </View>
        <ImagePicker images={images} onImagesChange={setImages} />
        <AudioPicker audios={audios} onAudiosChange={setAudios} />
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={() => { void handleSave(); }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Save' : 'Create'} note</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  contentInput: { minHeight: 200 },
  tagSection: { marginBottom: 24 },
  saveBtn: {
    backgroundColor: '#0a84ff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
