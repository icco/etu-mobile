import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getNote, deleteNote } from '../api/notes';
import MarkdownView from '../components/MarkdownView';
import { protoTimestampToDate } from '../utils/date';
import { isAuthError, getErrorMessage } from '../utils/errors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';

type Params = { noteId: string };

export default function NoteDetailScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const noteId = route.params?.noteId;
  const queryClient = useQueryClient();
  const { user, token, handleAuthError } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const {
    data: note,
    isLoading,
    error,
  } = useQuery({
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
    Alert.alert('Delete note', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteNote(user.id, token, noteId);
            void queryClient.invalidateQueries({
              queryKey: ['notes', user.id],
            });
            navigation.goBack();
          })();
        },
      },
    ]);
  };

  const handleEdit = () => {
    (
      navigation as { navigate: (name: string, params?: object) => void }
    ).navigate('NoteEdit', { noteId, note });
  };

  const getImageUrl = (image: {
    url?: string;
    data?: Uint8Array;
    mimeType?: string;
  }): string | null => {
    if (image.url) return image.url;
    if (image.data != null && image.mimeType) {
      const data = image.data;
      const binary = Array.from(data, (byte: number) =>
        String.fromCharCode(byte),
      ).join('');
      const base64 = (
        globalThis as unknown as { btoa(s: string): string }
      ).btoa(binary);
      return `data:${image.mimeType};base64,${base64}`;
    }
    return null;
  };

  if (!user || !token || !noteId) return null;
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error || !note) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Failed to load note</Text>
        <Text style={styles.errorDetail}>
          {error ? getErrorMessage(error) : 'Note not found'}
        </Text>
      </View>
    );
  }

  const created = protoTimestampToDate(note.createdAt);

  const images = note.images || [];
  const audios = note.audios || [];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.meta}>
          <Text style={styles.date}>
            {created.toLocaleDateString()} · {created.toLocaleTimeString()}
          </Text>
          {note.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {note.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <MarkdownView content={note.content} />

        {images.length > 0 && (
          <View style={styles.mediaSection}>
            <Text style={styles.mediaTitle}>Images ({images.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageList}
            >
              {images.map(image => {
                const imageUrl = getImageUrl(image);
                if (!imageUrl) return null;
                return (
                  <TouchableOpacity
                    key={image.id}
                    onPress={() => setSelectedImage(imageUrl)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.thumbnail}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {audios.length > 0 && (
          <View style={styles.mediaSection}>
            <Text style={styles.mediaTitle}>Audio ({audios.length})</Text>
            {audios.map((audio, index) => (
              <View key={audio.id} style={styles.audioItem}>
                <View style={styles.audioInfo}>
                  <Text style={styles.audioName} numberOfLines={1}>
                    {`Audio ${index + 1}`}
                  </Text>
                </View>
                <Text style={styles.audioNote}>Audio file attached</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {selectedImage && (
        <Modal
          visible={true}
          transparent={true}
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setSelectedImage(null)}
            >
              <Image
                source={{ uri: selectedImage }}
                style={{ width, height }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeButton, { top: insets.top + 16 }]}
              accessibilityRole="button"
              accessibilityLabel="Close image"
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingBottom: 48 },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    error: { color: colors.error, fontSize: 16 },
    errorDetail: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    meta: {
      marginBottom: 24,
      paddingBottom: 24,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.outline,
    },
    date: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
    tag: {
      backgroundColor: colors.primaryContainer,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    tagText: { color: colors.onPrimaryContainer, fontSize: 12, lineHeight: 18 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    editBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      minHeight: 48,
      justifyContent: 'center',
    },
    editBtnText: { color: colors.onPrimary, fontWeight: '600' },
    deleteBtn: {
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      minHeight: 48,
      justifyContent: 'center',
    },
    deleteBtnText: { color: colors.error, fontWeight: '600' },
    mediaSection: {
      marginTop: 24,
      marginBottom: 16,
    },
    mediaTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    imageList: {
      marginBottom: 8,
    },
    thumbnail: {
      width: 120,
      height: 120,
      borderRadius: 8,
      backgroundColor: colors.surfaceRaised,
      marginRight: 12,
    },
    audioItem: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    audioInfo: {
      marginBottom: 4,
    },
    audioName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 4,
    },
    audioSize: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    audioNote: {
      color: colors.primary,
      fontSize: 12,
      fontStyle: 'italic',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBackdrop: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      backgroundColor: colors.surfaceRaised,
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      color: colors.text,
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 32,
    },
  });
