/**
 * @format
 *
 * Renders real markdown through react-native-markdown-display (markdown-it),
 * guarding the markdown-it major-version override in package.json overrides.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import MarkdownView from '../src/components/MarkdownView';

describe('MarkdownView', () => {
  it('renders headings, emphasis, code, links, and lists', async () => {
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

    const { getByText } = await render(<MarkdownView content={content} />);

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

  it('autolinks bare URLs', async () => {
    const { getByText } = await render(
      <MarkdownView content="see https://example.com/page for details" />,
    );
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    await fireEvent.press(getByText('https://example.com/page'));
    expect(openURL).toHaveBeenCalledWith('https://example.com/page');
    openURL.mockRestore();
  });

  it('renders a placeholder for empty content', async () => {
    const { getByText } = await render(<MarkdownView content="" />);
    expect(getByText('No content')).toBeTruthy();
  });
});
