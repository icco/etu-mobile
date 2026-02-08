import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

export interface SelectedImage {
  uri: string;
  data: string; // base64
  mimeType: string;
  size: number;
}

interface ImagePickerProps {
  images: SelectedImage[];
  onImagesChange: (images: SelectedImage[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGES = 10;
const MAX_SIZE_MB = 5;

export default function ImagePicker({
  images,
  onImagesChange,
  maxImages = MAX_IMAGES,
  maxSizeMB = MAX_SIZE_MB,
}: ImagePickerProps) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleSelectImages = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `Maximum ${maxImages} images allowed`);
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: maxImages - images.length,
        quality: 0.8,
        includeBase64: false,
      });

      if (result.didCancel || !result.assets) {
        return;
      }

      const newImages: SelectedImage[] = [];

      for (const asset of result.assets) {
        // Validate MIME type
        const mimeType = asset.type || 'image/jpeg';
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          Alert.alert(
            'Invalid Format',
            `${asset.fileName || 'Image'} is not a supported format. Allowed: PNG, JPEG, WebP, GIF`
          );
          continue;
        }

        // Validate size
        const fileSize = asset.fileSize || 0;
        if (fileSize > maxSizeBytes) {
          Alert.alert(
            'File Too Large',
            `${asset.fileName || 'Image'} exceeds ${maxSizeMB} MiB limit`
          );
          continue;
        }

        // Read file as base64
        const uri = asset.uri;
        if (!uri) continue;

        try {
          const base64Data = await RNFS.readFile(uri, 'base64');
          newImages.push({
            uri,
            data: base64Data,
            mimeType,
            size: fileSize,
          });
        } catch (error) {
          console.error('Error reading image file:', error);
          Alert.alert('Error', `Failed to read ${asset.fileName || 'image'}`);
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Images ({images.length}/{maxImages})</Text>
        {images.length < maxImages && (
          <TouchableOpacity style={styles.addButton} onPress={() => void handleSelectImages()}>
            <Text style={styles.addButtonText}>+ Add Images</Text>
          </TouchableOpacity>
        )}
      </View>

      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveImage(index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={styles.hint}>
        Max {maxImages} images, {maxSizeMB} MiB each. PNG, JPEG, WebP, GIF
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#0a84ff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageList: {
    marginBottom: 8,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff453a',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});
