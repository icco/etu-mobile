/**
 * @format
 *
 * Renders real markdown through react-native-markdown-display (markdown-it),
 * guarding the markdown-it major-version override in package.json resolutions.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import MarkdownView from '../src/components/MarkdownView';

describe('MarkdownView', () => {
  it('renders headings, emphasis, code, links, and lists', () => {
    const content = [
      '# Title',
      '## Subtitle',
      'Some **bold** and _italic_ text with `inline code`.',
      '',
      '- first item',
      '- second item',
      '',
      '> a quote',
      '',
      '[a link](https://example.com)',
    ].join('\n');

    const { getByText } = render(<MarkdownView content={content} />);

    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Subtitle')).toBeTruthy();
    expect(getByText('bold')).toBeTruthy();
    expect(getByText('italic')).toBeTruthy();
    expect(getByText('inline code')).toBeTruthy();
    expect(getByText('first item')).toBeTruthy();
    expect(getByText('second item')).toBeTruthy();
    expect(getByText('a quote')).toBeTruthy();
    expect(getByText('a link')).toBeTruthy();
  });

  it('renders a placeholder for empty content', () => {
    const { getByText } = render(<MarkdownView content="" />);
    expect(getByText('No content')).toBeTruthy();
  });
});
