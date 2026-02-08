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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getNote, deleteNote } from '../api/notes';
import MarkdownView from '../components/MarkdownView';
import { protoTimestampToDate } from '../utils/date';
import { isAuthError, getErrorMessage } from '../utils/errors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = require('react-native').Dimensions.get('window');

type Params = { noteId: string };

export default function NoteDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: Params }, 'params'>>();
  const noteId = route.params?.noteId;
  const queryClient = useQueryClient();
  const { user, token, handleAuthError } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: note, isLoading, error } = useQuery({
    queryKey: ['note', noteId, user?.id],
    queryFn: () => getNote(user!.id, token!, noteId!),
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getImageUrl = (image: { url?: string; data?: Uint8Array; mimeType?: string }): string | null => {
    if (image.url) return image.url;
    if (image.data && image.mimeType) {
      // Convert Uint8Array to base64
      const binary = String.fromCharCode(...Array.from(image.data));
      const base64 = btoa(binary);
      return `data:${image.mimeType};base64,${base64}`;
    }
    return null;
  };

  const getAudioUrl = (audio: { url?: string; data?: Uint8Array; mimeType?: string }): string | null => {
    if (audio.url) return audio.url;
    if (audio.data && audio.mimeType) {
      // Convert Uint8Array to base64
      const binary = String.fromCharCode(...Array.from(audio.data));
      const base64 = btoa(binary);
      return `data:${audio.mimeType};base64,${base64}`;
    }
    return null;
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

  const images = note.images || [];
  const audios = note.audios || [];

  return (
    <>
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

        {images.length > 0 && (
          <View style={styles.mediaSection}>
            <Text style={styles.mediaTitle}>Images ({images.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
              {images.map((image, index) => {
                const imageUrl = getImageUrl(image);
                if (!imageUrl) return null;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedImage(imageUrl)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {audios.length > 0 && (
          <View style={styles.mediaSection}>
            <Text style={styles.mediaTitle}>Audio ({audios.length})</Text>
            {audios.map((audio, index) => {
              const audioUrl = getAudioUrl(audio);
              return (
                <View key={index} style={styles.audioItem}>
                  <View style={styles.audioInfo}>
                    <Text style={styles.audioName} numberOfLines={1}>
                      {audio.filename || `Audio ${index + 1}`}
                    </Text>
                    {audio.size && (
                      <Text style={styles.audioSize}>{formatFileSize(Number(audio.size))}</Text>
                    )}
                  </View>
                  <Text style={styles.audioNote}>Audio file attached</Text>
                </View>
              );
            })}
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
                style={styles.fullImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
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
  mediaSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  mediaTitle: {
    color: '#fff',
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
    backgroundColor: '#333',
    marginRight: 12,
  },
  audioItem: {
    backgroundColor: '#1c1c1e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  audioInfo: {
    marginBottom: 4,
  },
  audioName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  audioSize: {
    color: '#666',
    fontSize: 12,
  },
  audioNote: {
    color: '#0a84ff',
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
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#333',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
});
