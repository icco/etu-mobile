import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Note } from '../api/client';
import { protoTimestampToDate } from '../utils/date';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';
import Icon from './Icon';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
}

export default function NoteCard({ note, onPress }: NoteCardProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const date = protoTimestampToDate(note.createdAt);
  const tags = note.tags ?? [];
  const images = note.images?.length ?? 0;
  const audios = note.audios?.length ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${note.content || 'Note'}. ${date.toLocaleString()}`}
      accessibilityHint="Opens this note"
      onPress={onPress}
      android_ripple={{ color: colors.ripple }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.preview} numberOfLines={4}>
        {note.content || 'An attached memory'}
      </Text>
      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.slice(0, 4).map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          ))}
          {tags.length > 4 && (
            <Text style={styles.moreTags}>+{tags.length - 4}</Text>
          )}
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.date}>
          {date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
          {' · '}
          {date.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
        <View style={styles.media}>
          {images > 0 && (
            <View
              style={styles.indicator}
              accessibilityLabel={`${images} images`}
            >
              <Icon name="image" size={16} color={colors.textSecondary} />
              <Text style={styles.date}>{images}</Text>
            </View>
          )}
          {audios > 0 && (
            <View
              style={styles.indicator}
              accessibilityLabel={`${audios} audio attachments`}
            >
              <Icon name="audio" size={16} color={colors.textSecondary} />
              <Text style={styles.date}>{audios}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
      marginVertical: 6,
      overflow: 'hidden',
    },
    pressed: { backgroundColor: colors.surfaceRaised },
    preview: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 25,
      letterSpacing: 0.1,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 16,
      gap: 8,
    },
    tag: {
      backgroundColor: colors.primaryContainer,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      maxWidth: '100%',
    },
    tagText: {
      color: colors.onPrimaryContainer,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },
    moreTags: { color: colors.textSecondary, fontSize: 12 },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 16,
    },
    date: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    media: { flexDirection: 'row', gap: 12 },
    indicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  });
