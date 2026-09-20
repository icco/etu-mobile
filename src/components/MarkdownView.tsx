import React from 'react';
import Markdown from 'react-native-markdown-display';
import { StyleSheet } from 'react-native';
import { useThemedStyles, type Colors } from '../theme';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    body: { color: colors.text, fontSize: 16, lineHeight: 26 },
    paragraph: { marginTop: 0, marginBottom: 16 },
    heading1: {
      color: colors.text,
      fontSize: 28,
      lineHeight: 36,
      fontWeight: '700',
      marginBottom: 16,
    },
    heading2: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600',
      marginBottom: 12,
    },
    heading3: {
      color: colors.text,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
      marginBottom: 8,
    },
    code_inline: {
      backgroundColor: colors.surfaceRaised,
      color: colors.primary,
      borderColor: colors.outline,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      borderColor: colors.outline,
      padding: 16,
      borderRadius: 12,
    },
    fence: {
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      borderColor: colors.outline,
      padding: 16,
      borderRadius: 12,
    },
    link: { color: colors.primary, textDecorationLine: 'underline' },
    blockquote: {
      backgroundColor: colors.surface,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      padding: 16,
      marginVertical: 8,
    },
    list_item: { color: colors.text, marginBottom: 6 },
    image: { marginVertical: 12, borderRadius: 12 },
    hr: { backgroundColor: colors.outline },
    table: { borderColor: colors.outline, borderRadius: 8 },
    tr: { borderColor: colors.outline },
    th: { backgroundColor: colors.surfaceRaised, padding: 8 },
    td: { padding: 8 },
  });

export default function MarkdownView({ content }: { content: string }) {
  const styles = useThemedStyles(createStyles);
  return <Markdown style={styles}>{content || '_No content_'}</Markdown>;
}
