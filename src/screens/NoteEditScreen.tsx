import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  usePreventRemove,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getNote, updateNote, listTags } from '../api/notes';
import { createNoteOrQueue } from '../api/offlineQueue';
import { getErrorMessage } from '../utils/errors';
import TagInput from '../components/TagInput';
import ImagePicker, { SelectedImage } from '../components/ImagePicker';
import AudioPicker, { SelectedAudio } from '../components/AudioPicker';
import Icon, { type IconName } from '../components/Icon';
import type { RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';
import { useHeaderHeight } from '@react-navigation/elements';

type Panel = 'tags' | 'images' | 'audio';

export default function NoteEditScreen() {
  const { colors, dark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'NoteEdit'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NoteEdit'>>();
  const noteId = route.params?.noteId;
  const existingNote = route.params?.note;
  const initialContent = route.params?.initialContent;
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  const [content, setContent] = useState(initialContent ?? '');
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [audios, setAudios] = useState<SelectedAudio[]>([]);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // "Adjust state during render" so local state re-syncs only when the source changes:
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
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
      setContent(initialContent ?? '');
    }
  }

  const baseTags = sourceNote?.tags ?? [];
  const dirty =
    content.trim() !== (sourceNote?.content ?? initialContent ?? '').trim() ||
    tags.join('\n') !== baseTags.join('\n') ||
    images.length > 0 ||
    audios.length > 0;
  const canSave = !saving && !!content.trim();

  usePreventRemove(dirty && !saved, ({ data }) => {
    Alert.alert('Discard note?', 'Your changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  useEffect(() => {
    if (saved) navigation.goBack();
  }, [saved, navigation]);

  const handleSave = async () => {
    if (!user || !token || !content.trim()) return;
    setSaving(true);
    try {
      const imageUploads = images.map(img => ({
        data: img.data,
        mimeType: img.mimeType,
      }));
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
        const result = await createNoteOrQueue(
          user.id,
          token,
          content.trim(),
          tags,
          imageUploads.length > 0 ? imageUploads : undefined,
          audioUploads.length > 0 ? audioUploads : undefined,
        );
        if (result.status === 'queued') {
          Alert.alert(
            'Saved offline',
            'Your note is saved on this device and will sync when you are back online.',
          );
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['notes', user.id] });
      setSaved(true);
    } catch (e) {
      Alert.alert('Error', getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEdit ? 'Cancel' : 'Close'}
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.headerIcon}
        >
          <Icon name="close" color={colors.text} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save note"
          accessibilityState={{ disabled: !canSave, busy: saving }}
          disabled={!canSave}
          onPress={() => {
            void handleSave();
          }}
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      ),
    });
  });

  if (!user || !token) return null;
  if (isEdit && !existingNote && isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const tools: { key: Panel; icon: IconName; label: string; count: number }[] =
    [
      { key: 'tags', icon: 'tag', label: 'Tags', count: tags.length },
      { key: 'images', icon: 'image', label: 'Photos', count: images.length },
      { key: 'audio', icon: 'audio', label: 'Audio', count: audios.length },
    ];
  const show = (key: Panel, count: number) => panel === key || count > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.contentInput}
          placeholder="What’s on your mind?"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Note content"
          selectionColor={colors.primary}
          keyboardAppearance={dark ? 'dark' : 'light'}
          autoFocus={!isEdit}
          value={content}
          onChangeText={setContent}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
        />
        {show('tags', tags.length) ? (
          <View style={styles.section}>
            <TagInput
              selectedTags={tags}
              onTagsChange={setTags}
              suggestions={tagList}
            />
          </View>
        ) : null}
        {show('images', images.length) ? (
          <ImagePicker images={images} onImagesChange={setImages} />
        ) : null}
        {show('audio', audios.length) ? (
          <AudioPicker audios={audios} onAudiosChange={setAudios} />
        ) : null}
      </ScrollView>
      <View
        style={[styles.toolbar, { paddingBottom: insets.bottom + 8 }]}
        accessibilityRole="toolbar"
      >
        {tools.map(tool => {
          const active = panel === tool.key;
          return (
            <Pressable
              key={tool.key}
              accessibilityRole="button"
              accessibilityLabel={tool.label}
              accessibilityState={{ expanded: active }}
              android_ripple={{ color: colors.ripple, borderless: true }}
              onPress={() => setPanel(active ? null : tool.key)}
              style={[styles.tool, active && styles.toolActive]}
            >
              <Icon
                name={tool.icon}
                color={active ? colors.onPrimaryContainer : colors.textSecondary}
              />
              {tool.count > 0 ? (
                <Text style={styles.toolCount}>{tool.count}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: 20, flexGrow: 1 },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    contentInput: {
      flexGrow: 1,
      minHeight: 200,
      fontSize: 18,
      lineHeight: 28,
      color: colors.text,
      padding: 0,
      marginBottom: 16,
    },
    section: { marginBottom: 16 },
    headerIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      minHeight: 40,
      minWidth: 72,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
    toolbar: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: colors.surface,
    },
    tool: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 48,
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 24,
      justifyContent: 'center',
    },
    toolActive: { backgroundColor: colors.primaryContainer },
    toolCount: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  });
