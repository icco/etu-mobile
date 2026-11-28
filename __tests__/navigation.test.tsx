import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type * as Navigation from '@react-navigation/native';
import { linking } from '../src/navigation/RootNavigator';
import NewNoteButton from '../src/components/NewNoteButton';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual<typeof Navigation>('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const { getStateFromPath } = jest.requireActual<typeof Navigation>(
  '@react-navigation/native',
);

it.each([
  ['text', {}],
  ['voice', { attach: 'audio' }],
  ['photo', { attach: 'images' }],
])('opens a %s note from the New note menu', async (kind, params) => {
  const { getByRole } = await render(<NewNoteButton />);
  await fireEvent.press(getByRole('button', { name: 'New note' }));
  await fireEvent.press(getByRole('button', { name: `New ${kind} note` }));
  expect(mockNavigate).toHaveBeenCalledWith('NoteEdit', params);
});

it.each([
  ['capture', 'NoteEdit'],
  ['edit', 'NoteEdit'],
  ['note/note-123', 'NoteDetail'],
  ['login', 'Login'],
  ['register', 'Register'],
])('preserves the %s stack deep link', (path, screen) => {
  const state = getStateFromPath(path, linking.config);
  expect(state?.routes.at(-1)?.name).toBe(screen);
  if (screen === 'NoteEdit') expect(state?.routes[0].name).toBe('MainTabs');
  if (screen === 'NoteDetail')
    expect(state?.routes.at(-1)?.params).toEqual({ noteId: 'note-123' });
});

it.each([
  ['', 'Timeline'],
  ['random', 'Random'],
  ['search', 'Search'],
  ['settings', 'Settings'],
])('preserves the %s tab deep link', (path, screen) => {
  const state = getStateFromPath(path, linking.config);
  expect(state?.routes[0].name).toBe('MainTabs');
  expect(state?.routes[0].state?.routes[0].name).toBe(screen);
});
