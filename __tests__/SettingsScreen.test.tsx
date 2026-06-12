/**
 * @format
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import SettingsScreen from '../src/screens/SettingsScreen';

jest.mock('../src/api/settings');
jest.mock('../src/api/stats');

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    token: 'test-token',
    logout: jest.fn(),
    refreshUser: jest.fn(),
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

const mockedUseQuery = useQuery as jest.Mock;

const userStats = { totalBlips: 1234, uniqueTags: 56, wordsWritten: 78901 };
const globalStats = { totalBlips: 99999, uniqueTags: 888, wordsWritten: 7654321 };

describe('SettingsScreen stats section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'stats' && queryKey[1] === 'user-1') {
        return { data: userStats, isLoading: false, error: null };
      }
      if (queryKey[0] === 'stats' && queryKey[1] === 'global') {
        return { data: globalStats, isLoading: false, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });
  });

  it('shows a Statistics entry in the main section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('View statistics →')).toBeTruthy();
  });

  it('renders user and community stats blocks with formatted numbers', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('View statistics →'));

    expect(getByText('Your Statistics')).toBeTruthy();
    expect(getByText('Community Statistics')).toBeTruthy();

    expect(getByText(userStats.totalBlips.toLocaleString())).toBeTruthy();
    expect(getByText(userStats.uniqueTags.toLocaleString())).toBeTruthy();
    expect(getByText(userStats.wordsWritten.toLocaleString())).toBeTruthy();

    expect(getByText(globalStats.totalBlips.toLocaleString())).toBeTruthy();
    expect(getByText(globalStats.uniqueTags.toLocaleString())).toBeTruthy();
    expect(getByText(globalStats.wordsWritten.toLocaleString())).toBeTruthy();
  });

  it('shows loading indicators while stats queries are loading', () => {
    mockedUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'stats') {
        return { data: undefined, isLoading: true, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    const { getByText, queryByText, UNSAFE_getAllByType } = render(<SettingsScreen />);
    fireEvent.press(getByText('View statistics →'));

    expect(getByText('Your Statistics')).toBeTruthy();
    expect(getByText('Community Statistics')).toBeTruthy();
    expect(UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(2);
    expect(queryByText('Blips')).toBeNull();
    expect(queryByText('Failed to load stats')).toBeNull();
  });

  it('shows error text when stats queries fail', () => {
    mockedUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'stats') {
        return { data: undefined, isLoading: false, error: new Error('boom') };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    const { getByText, getAllByText, queryByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('View statistics →'));

    expect(getAllByText('Failed to load stats')).toHaveLength(2);
    expect(getAllByText('boom')).toHaveLength(2);
    expect(queryByText('Blips')).toBeNull();
  });

  it('returns to the main section via the back button', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('View statistics →'));
    fireEvent.press(getByText('← Settings'));

    expect(getByText('View statistics →')).toBeTruthy();
  });
});
