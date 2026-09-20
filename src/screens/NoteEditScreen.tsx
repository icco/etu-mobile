import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';
import { useHeaderHeight } from '@react-navigation/elements';

type Params = { noteId?: string; note?: Note; initialContent?: string };

export default function NoteEditScreen() {
  const { colors, dark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
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
  // Track which Note (or initial-content draft) we have already hydrated
  // local form state from, so we re-sync only when the source actually
  // changes. See https://react.dev/reference/react/useState#storing-information-from-previous-renders
  // for the "adjust state during render" pattern that avoids the
  // react-hooks/set-state-in-effect anti-pattern.
  const [hydratedSourceId, setHydratedSourceId] = useState<string | null>(null);

  const isEdit = !!noteId;

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

  // Source of truth, in priority order:
  //   1. existingNote handed to us via route params (instant edit)
  //   2. note fetched from server when only noteId was provided
  //   3. initialContent draft (e.g. share-extension entry point)
  const sourceNote = existingNote ?? note;
  const sourceId =
    sourceNote?.id ??
    (initialContent !== undefined && !noteId ? '__draft__' : null);

  if (sourceId && sourceId !== hydratedSourceId) {
    setHydratedSourceId(sourceId);
    if (sourceNote) {
      setContent(sourceNote.content);
      setTags(sourceNote.tags ?? []);
    } else {
      // initialContent draft path
      setContent(initialContent ?? '');
    }
  }

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
          audioUploads.length > 0 ? audioUploads : undefined,
        );
        void queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      } else {
        await createNote(
          user.id,
          token,
          content.trim(),
          tags,
          imageUploads.length > 0 ? imageUploads : undefined,
          audioUploads.length > 0 ? audioUploads : undefined,
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>YOUR NOTE</Text>
        <TextInput
          style={[styles.input, styles.contentInput]}
          placeholder="Write in Markdown…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Note content"
          selectionColor={colors.primary}
          keyboardAppearance={dark ? 'dark' : 'light'}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.tagSection}>
          <Text style={styles.label}>TAGS</Text>
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
          onPress={() => {
            void handleSave();
          }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit ? 'Save' : 'Create'} note
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1.2,
      marginBottom: 12,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 48 },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      fontSize: 16,
      color: colors.text,
      lineHeight: 26,
      marginBottom: 16,
    },
    contentInput: { minHeight: 260 },
    tagSection: { marginBottom: 24 },
    saveBtn: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 28,
      minHeight: 56,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  });
