import React from 'react';
import Markdown from 'react-native-markdown-display';

const markdownStyles = {
  body: { color: '#fff', fontSize: 16, lineHeight: 24 },
  paragraph: { marginTop: 0, marginBottom: 12 },
  heading1: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  heading2: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 10 },
  heading3: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  code_inline: { backgroundColor: '#333', color: '#0a84ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  code_block: { backgroundColor: '#1c1c1e', color: '#fff', padding: 12, borderRadius: 8, marginVertical: 8 },
  link: { color: '#0a84ff' },
  blockquote: { borderLeftWidth: 4, borderLeftColor: '#0a84ff', paddingLeft: 12, marginVertical: 8, color: '#888' },
  list_item: { color: '#fff', marginBottom: 4 },
  image: { marginVertical: 8, borderRadius: 8 },
};

interface MarkdownViewProps {
  content: string;
}

export default function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <Markdown style={markdownStyles}>
      {content || '_No content_'}
    </Markdown>
  );
}
