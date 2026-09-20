import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { Tag } from '../api/client';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';

interface TagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions: Tag[];
  placeholder?: string;
}

export default function TagInput({
  selectedTags,
  onTagsChange,
  suggestions,
  placeholder = 'Add tags…',
}: TagInputProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = useMemo(() => {
    if (!input.trim()) return suggestions.slice(0, 15);
    const lower = input.toLowerCase();
    return suggestions
      .filter(t => t.name.toLowerCase().includes(lower))
      .slice(0, 15);
  }, [input, suggestions]);

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    if (selectedTags.includes(t)) return;
    onTagsChange([...selectedTags, t]);
    setInput('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onTagsChange(selectedTags.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    if (input.trim()) addTag(input.trim());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.chipRow}>
        {selectedTags.map(tag => (
          <TouchableOpacity
            key={tag}
            style={styles.chip}
            onPress={() => removeTag(tag)}
            accessibilityRole="button"
            accessibilityLabel={`Remove tag ${tag}`}
          >
            <Text style={styles.chipText}>{tag} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Add tags"
        value={input}
        onChangeText={text => {
          setInput(text);
          setShowSuggestions(true);
        }}
        onSubmitEditing={handleSubmit}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {showSuggestions && filtered.length > 0 ? (
        <View style={styles.suggestions}>
          {filtered.map(s => (
            <TouchableOpacity
              key={s.id}
              style={styles.suggestionItem}
              onPress={() => addTag(s.name)}
            >
              <Text style={styles.suggestionText}>{s.name}</Text>
              <Text style={styles.suggestionCount}>{s.count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    chip: {
      backgroundColor: colors.primaryContainer,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 12,
      minHeight: 48,
      justifyContent: 'center',
    },
    chipText: { color: colors.onPrimaryContainer, fontSize: 14 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      minHeight: 56,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    suggestions: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginTop: 4,
    },
    suggestionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline,
      minHeight: 48,
    },
    suggestionText: { color: colors.text, fontSize: 16 },
    suggestionCount: { color: colors.textSecondary, fontSize: 14 },
  });
