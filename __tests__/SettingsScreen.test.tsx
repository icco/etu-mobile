/**
 * @format
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import SettingsScreen from '../src/screens/SettingsScreen';

jest.mock('../src/api/settings');
jest.mock('../src/api/stats');
jest.mock('../src/api/offlineQueue', () => ({ useQueuedNoteTotal: () => mockPendingCount }));

const mockLogout = jest.fn();
let mockPendingCount: number | null = 0;

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    token: 'test-token',
    logout: mockLogout,
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

  it('shows a Statistics entry in the main section', async () => {
    const { getByText } = await render(<SettingsScreen />);
    expect(getByText('View statistics →')).toBeTruthy();
  });

  it('renders user and community stats blocks with formatted numbers', async () => {
    const { getByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByText('View statistics →'));

    expect(getByText('Your Statistics')).toBeTruthy();
    expect(getByText('Community Statistics')).toBeTruthy();

    expect(getByText(userStats.totalBlips.toLocaleString())).toBeTruthy();
    expect(getByText(userStats.uniqueTags.toLocaleString())).toBeTruthy();
    expect(getByText(userStats.wordsWritten.toLocaleString())).toBeTruthy();

    expect(getByText(globalStats.totalBlips.toLocaleString())).toBeTruthy();
    expect(getByText(globalStats.uniqueTags.toLocaleString())).toBeTruthy();
    expect(getByText(globalStats.wordsWritten.toLocaleString())).toBeTruthy();
  });

  it('shows loading indicators while stats queries are loading', async () => {
    mockedUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'stats') {
        return { data: undefined, isLoading: true, error: null };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    const { getByText, queryByText, getAllByTestId } = await render(<SettingsScreen />);
    await fireEvent.press(getByText('View statistics →'));

    expect(getByText('Your Statistics')).toBeTruthy();
    expect(getByText('Community Statistics')).toBeTruthy();
    expect(getAllByTestId('stats-loader')).toHaveLength(2);
    expect(queryByText('Blips')).toBeNull();
    expect(queryByText('Failed to load stats')).toBeNull();
  });

  it('shows error text when stats queries fail', async () => {
    mockedUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'stats') {
        return { data: undefined, isLoading: false, error: new Error('boom') };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    const { getByText, getAllByText, queryByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByText('View statistics →'));

    expect(getAllByText('Failed to load stats')).toHaveLength(2);
    expect(getAllByText('boom')).toHaveLength(2);
    expect(queryByText('Blips')).toBeNull();
  });

  it('returns to the main section via the back button', async () => {
    const { getByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByText('View statistics →'));
    await fireEvent.press(getByText('← Settings'));

    expect(getByText('View statistics →')).toBeTruthy();
  });
});

describe('SettingsScreen legal links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  it.each([
    ['Privacy policy →', 'https://etu.timeclimbers.com/privacy'],
    ['Terms of service →', 'https://etu.timeclimbers.com/terms'],
    ['Refund policy →', 'https://etu.timeclimbers.com/refunds'],
  ])('opens %s', async (label, url) => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { getByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByText(label));
    expect(openURL).toHaveBeenCalledWith(url);
  });
});

describe('SettingsScreen sign out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  it('signs out at once when nothing is queued', async () => {
    mockPendingCount = 0;
    const { getByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByText('Sign out'));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('asks before deleting unsynced notes', async () => {
    mockPendingCount = 2;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByText('Sign out'));
    expect(mockLogout).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Sign out?', '2 offline notes have not synced and will be deleted.', expect.any(Array));
  });
});

it('warns when the offline queue could not be read', async () => {
  mockedUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  mockPendingCount = null;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByText('Sign out'));
  expect(mockLogout).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith('Sign out?', 'Offline notes could not be read and will be deleted.', expect.any(Array));
});
