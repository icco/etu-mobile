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
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = useMemo(() => {
    if (!input.trim()) return suggestions.slice(0, 15);
    const lower = input.toLowerCase();
    return suggestions
      .filter((t) => t.name.toLowerCase().includes(lower))
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
    onTagsChange(selectedTags.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    if (input.trim()) addTag(input.trim());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.chipRow}>
        {selectedTags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={styles.chip}
            onPress={() => removeTag(tag)}
          >
            <Text style={styles.chipText}>{tag} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#666"
        value={input}
        onChangeText={(text) => {
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
          {filtered.map((s) => (
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

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: { color: '#0a84ff', fontSize: 14 },
  input: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  suggestions: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  suggestionText: { color: '#fff', fontSize: 16 },
  suggestionCount: { color: '#666', fontSize: 14 },
});
