import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import AudioRecorderPlayer from 'react-native-nitro-sound';

export interface SelectedAudio {
  uri: string;
  name: string;
  data: string; // base64
  mimeType: string;
  size: number;
}

interface AudioPickerProps {
  audios: SelectedAudio[];
  onAudiosChange: (audios: SelectedAudio[]) => void;
  maxAudios?: number;
  maxSizeMB?: number;
}

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/flac',
  'audio/aac',
];

const MAX_AUDIOS = 5;
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const audioRecorderPlayer = new AudioRecorderPlayer();

export default function AudioPicker({
  audios,
  onAudiosChange,
  maxAudios = MAX_AUDIOS,
  maxSizeMB = MAX_SIZE_MB,
}: AudioPickerProps) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const handleSelectAudios = async () => {
    if (audios.length >= maxAudios) {
      Alert.alert('Limit Reached', `Maximum ${maxAudios} audio files allowed`);
      return;
    }

    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
        allowMultiSelection: true,
        copyTo: 'cachesDirectory',
      });

      const newAudios: SelectedAudio[] = [];

      for (const file of results) {
        // Validate MIME type
        const mimeType = file.type || 'audio/mpeg';
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          Alert.alert(
            'Invalid Format',
            `${file.name} is not a supported audio format`
          );
          continue;
        }

        // Validate size
        const fileSize = file.size || 0;
        if (fileSize > maxSizeBytes) {
          Alert.alert(
            'File Too Large',
            `${file.name} exceeds ${maxSizeMB} MiB limit`
          );
          continue;
        }

        // Check if we've reached the limit
        if (audios.length + newAudios.length >= maxAudios) {
          Alert.alert('Limit Reached', `Maximum ${maxAudios} audio files allowed`);
          break;
        }

        // Read file as base64
        const uri = file.fileCopyUri || file.uri;
        try {
          const base64Data = await RNFS.readFile(uri, 'base64');
          newAudios.push({
            uri,
            name: file.name,
            data: base64Data,
            mimeType,
            size: fileSize,
          });
        } catch (error) {
          console.error('Error reading audio file:', error);
          Alert.alert('Error', `Failed to read ${file.name}`);
        }
      }

      if (newAudios.length > 0) {
        onAudiosChange([...audios, ...newAudios]);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        // User cancelled
        return;
      }
      console.error('Audio picker error:', error);
      Alert.alert('Error', 'Failed to select audio files');
    }
  };

  const handleRemoveAudio = (index: number) => {
    const newAudios = audios.filter((_, i) => i !== index);
    onAudiosChange(newAudios);
  };

  const handleStartRecording = async () => {
    if (audios.length >= maxAudios) {
      Alert.alert('Limit Reached', `Maximum ${maxAudios} audio files allowed`);
      return;
    }

    try {
      const path = await audioRecorderPlayer.startRecorder();
      setIsRecording(true);
      setRecordingTime(0);

      // Update recording time every second
      audioRecorderPlayer.addRecordBackListener((e: { currentPosition: number }) => {
        setRecordingTime(Math.floor(e.currentPosition / 1000));
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setRecordingTime(0);

      if (!result) {
        Alert.alert('Error', 'Failed to save recording');
        return;
      }

      // Read the recorded file
      const fileInfo = await RNFS.stat(result);
      const fileSize = fileInfo.size;

      // Validate size
      if (fileSize > maxSizeBytes) {
        Alert.alert(
          'File Too Large',
          `Recording exceeds ${maxSizeMB} MiB limit. Try recording a shorter audio.`
        );
        // Delete the file
        await RNFS.unlink(result);
        return;
      }

      // Read file as base64
      const base64Data = await RNFS.readFile(result, 'base64');
      const fileName = `recording-${Date.now()}.m4a`;
      const mimeType = 'audio/m4a';

      const newAudio: SelectedAudio = {
        uri: result,
        name: fileName,
        data: base64Data,
        mimeType,
        size: fileSize,
      };

      onAudiosChange([...audios, newAudio]);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to save recording');
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Audio ({audios.length}/{maxAudios})</Text>
        <View style={styles.headerButtons}>
          {audios.length < maxAudios && !isRecording && (
            <>
              <TouchableOpacity style={styles.recordButton} onPress={handleStartRecording}>
                <Text style={styles.recordButtonText}>🎙️ Record</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={handleSelectAudios}>
                <Text style={styles.addButtonText}>+ Add Audio</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingHeader}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording {formatRecordingTime(recordingTime)}</Text>
          </View>
          <TouchableOpacity style={styles.stopButton} onPress={handleStopRecording}>
            <Text style={styles.stopButtonText}>⏹ Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {audios.length > 0 && (
        <View style={styles.audioList}>
          {audios.map((audio, index) => (
            <View key={index} style={styles.audioItem}>
              <View style={styles.audioInfo}>
                <Text style={styles.audioName} numberOfLines={1}>
                  {audio.name}
                </Text>
                <Text style={styles.audioSize}>{formatFileSize(audio.size)}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveAudio(index)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        Max {maxAudios} files, {maxSizeMB} MiB each. MP3, WAV, OGG, M4A, FLAC, AAC
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
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
  recordButton: {
    backgroundColor: '#ff453a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingIndicator: {
    backgroundColor: '#1c1c1e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff453a',
  },
  recordingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  stopButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stopButtonText: {
    color: '#ff453a',
    fontSize: 14,
    fontWeight: '600',
  },
  audioList: {
    marginBottom: 8,
  },
  audioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  audioInfo: {
    flex: 1,
    marginRight: 12,
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
  removeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#ff453a',
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});
