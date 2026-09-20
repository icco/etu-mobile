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

it('opens Capture from the New note action', async () => {
  const { getByRole } = await render(<NewNoteButton />);
  await fireEvent.press(getByRole('button', { name: 'New note' }));
  expect(mockNavigate).toHaveBeenCalledWith('Capture');
});

it.each([
  ['capture', 'Capture'],
  ['edit', 'NoteEdit'],
  ['note/note-123', 'NoteDetail'],
  ['login', 'Login'],
  ['register', 'Register'],
])('preserves the %s stack deep link', (path, screen) => {
  const state = getStateFromPath(path, linking.config);
  expect(state?.routes.at(-1)?.name).toBe(screen);
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
