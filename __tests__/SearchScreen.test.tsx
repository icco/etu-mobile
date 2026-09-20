import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import SearchScreen from '../src/screens/SearchScreen';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    token: 'token',
    handleAuthError: jest.fn(),
  }),
}));

const mockedQuery = jest.mocked(useQuery);

beforeEach(() => {
  mockedQuery.mockImplementation(
    options =>
      ({
        data:
          options.queryKey[0] === 'tags'
            ? [{ id: 'tag-1', name: 'nature' }]
            : { notes: [] },
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useQuery>,
  );
});

it('retains collapsed filters and clears them explicitly', async () => {
  const { getByRole, getByText, queryByText, getByLabelText } = await render(
    <SearchScreen />,
  );
  expect(queryByText('Filter by tag')).toBeNull();
  await fireEvent.press(getByRole('button', { name: 'Search filters' }));
  await fireEvent.press(getByRole('button', { name: 'nature' }));
  await fireEvent.changeText(
    getByLabelText('Start date, YYYY-MM-DD'),
    '2026-01-01',
  );
  expect(getByRole('button', { name: 'nature' })).toHaveProp('accessibilityState', {
    selected: true,
  });
  await fireEvent.press(getByRole('button', { name: 'Search filters' }));
  expect(queryByText('Filter by tag')).toBeNull();
  expect(getByText('Clear filters · 2 active')).toBeTruthy();
  await fireEvent.press(getByText('Clear filters · 2 active'));
  expect(queryByText('Clear filters · 2 active')).toBeNull();
  await fireEvent.press(getByRole('button', { name: 'Search filters' }));
  expect(getByRole('button', { name: 'nature' })).toHaveProp('accessibilityState', {
    selected: false,
  });
  expect(getByLabelText('Start date, YYYY-MM-DD')).toHaveProp('value', '');
});

it('clears the search query from its labeled action', async () => {
  const { getByRole, getByLabelText } = await render(<SearchScreen />);
  await fireEvent.changeText(getByLabelText('Search notes'), 'wind');
  await fireEvent.press(getByRole('button', { name: 'Clear search' }));
  expect(getByLabelText('Search notes')).toHaveProp('value', '');
});
