/**
 * @format
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import RNFS from 'react-native-fs';
import { ConnectError, Code } from '@connectrpc/connect';
import { saveDocuments, isErrorWithCode } from '@react-native-documents/picker';
import { useQuery } from '@tanstack/react-query';
import SettingsScreen from '../src/screens/SettingsScreen';
import { deleteAccount, exportDataToFile, type ExportProgress } from '../src/api/account';

jest.mock('../src/api/settings');
jest.mock('../src/api/stats');
jest.mock('../src/utils/logger');
jest.mock('../src/api/account', () => ({
  deleteAccount: jest.fn(),
  exportDataToFile: jest.fn(),
  exportFileName: () => 'etu-export-2026-10-17.json',
}));

const mockLogout = jest.fn(() => Promise.resolve());
const mockClear = jest.fn();

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    token: 'test-token',
    logout: mockLogout,
    refreshUser: jest.fn(),
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(), clear: mockClear }),
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

const CONFIRMATION = 'I understand this permanently deletes my account and data';

describe('SettingsScreen delete account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  async function openDelete() {
    const screen = await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('Delete account →'));
    return screen;
  }

  it('requires the password and the irreversible confirmation', async () => {
    const { getByRole, getByLabelText } = await openDelete();
    const button = getByRole('button', { name: 'Permanently delete account' });
    expect(button).toBeDisabled();
    await fireEvent.changeText(getByLabelText('Current password'), 'hunter22');
    expect(button).toBeDisabled();
    await fireEvent(getByLabelText(CONFIRMATION), 'valueChange', true);
    expect(button).toBeEnabled();
  });

  it('deletes the account, clears cached data and signs out', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(deleteAccount).mockResolvedValue();
    const { getByRole, getByLabelText } = await openDelete();
    await fireEvent.changeText(getByLabelText('Current password'), 'hunter22');
    await fireEvent(getByLabelText(CONFIRMATION), 'valueChange', true);
    await fireEvent.press(getByRole('button', { name: 'Permanently delete account' }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(deleteAccount).toHaveBeenCalledWith('user-1', 'test-token', 'hunter22');
    expect(mockClear).toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Account deleted', expect.any(String));
  });

  it.each([
    [new ConnectError('incorrect password', Code.PermissionDenied), 'Current password is incorrect'],
    [new ConnectError('account is locked', Code.PermissionDenied), 'Too many failed attempts. Try again later.'],
    [new ConnectError('slow down', Code.ResourceExhausted), 'Too many attempts. Try again later.'],
  ])('shows an error and stays signed in when deletion fails (%s)', async (error, message) => {
    jest.mocked(deleteAccount).mockRejectedValue(error);
    const { getByRole, getByLabelText, findByText } = await openDelete();
    await fireEvent.changeText(getByLabelText('Current password'), 'wrong-password');
    await fireEvent(getByLabelText(CONFIRMATION), 'valueChange', true);
    await fireEvent.press(getByRole('button', { name: 'Permanently delete account' }));

    expect(await findByText(message)).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('points to support when deletion fails unexpectedly', async () => {
    jest.mocked(deleteAccount).mockRejectedValue(new ConnectError('cancel subscription', Code.Unavailable));
    const { getByRole, getByLabelText, findByText } = await openDelete();
    await fireEvent.changeText(getByLabelText('Current password'), 'hunter22');
    await fireEvent(getByLabelText(CONFIRMATION), 'valueChange', true);
    await fireEvent.press(getByRole('button', { name: 'Permanently delete account' }));

    expect(await findByText(/contact nat@natwelch.com/)).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

describe('SettingsScreen export data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
  });

  it('streams the export to a file and offers to save it', async () => {
    jest.mocked(exportDataToFile).mockResolvedValue({ path: '/cache/etu-export-2026-10-17.json', progress: { items: 4, notes: 2 } });
    const { getByRole, findByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByRole('button', { name: 'Export data →' }));

    expect(await findByText('Saved 2 notes to etu-export-2026-10-17.json')).toBeTruthy();
    expect(exportDataToFile).toHaveBeenCalledWith('user-1', 'test-token', expect.any(Function), expect.any(AbortSignal));
    expect(saveDocuments).toHaveBeenCalledWith({
      sourceUris: ['file:///cache/etu-export-2026-10-17.json'],
      mimeType: 'application/json',
      fileName: 'etu-export-2026-10-17.json',
      copy: true,
    });
    expect(RNFS.unlink).toHaveBeenCalledWith('/cache/etu-export-2026-10-17.json');
  });

  it('shows progress while exporting', async () => {
    let report!: (progress: ExportProgress) => void;
    jest.mocked(exportDataToFile).mockImplementation((_userId, _token, onProgress) => {
      report = onProgress!;
      return new Promise(() => {});
    });
    const { getByRole, findByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByRole('button', { name: 'Export data →' }));
    expect(await findByText('Exporting... 0 notes')).toBeTruthy();
    report({ items: 4, notes: 3 });
    expect(await findByText('Exporting... 3 notes')).toBeTruthy();
    expect(getByRole('button', { name: 'Export data →' })).toBeDisabled();
  });

  it('shows export errors', async () => {
    jest.mocked(exportDataToFile).mockRejectedValue(new Error('stream broke'));
    const { getByRole, findByText, getByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByRole('button', { name: 'Export data →' }));

    expect(await findByText('Export failed')).toBeTruthy();
    expect(getByText('stream broke')).toBeTruthy();
    expect(saveDocuments).not.toHaveBeenCalled();
  });

  it('reports when the user dismisses the save dialog', async () => {
    jest.mocked(exportDataToFile).mockResolvedValue({ path: '/cache/etu-export-2026-10-17.json', progress: { items: 1, notes: 0 } });
    jest.mocked(saveDocuments).mockRejectedValueOnce({ code: 'OPERATION_CANCELED' });
    jest.mocked(isErrorWithCode).mockReturnValueOnce(true);
    const { getByRole, findByText } = await render(<SettingsScreen />);
    await fireEvent.press(getByRole('button', { name: 'Export data →' }));

    expect(await findByText('Export not saved')).toBeTruthy();
    expect(RNFS.unlink).toHaveBeenCalledWith('/cache/etu-export-2026-10-17.json');
  });

  it('skips the save dialog and cleans up the file if unmounted when export finishes', async () => {
    let finish!: (value: { path: string; progress: ExportProgress }) => void;
    jest.mocked(exportDataToFile).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { getByRole, unmount } = await render(<SettingsScreen />);
    await fireEvent.press(getByRole('button', { name: 'Export data →' }));
    await unmount();
    finish({ path: '/cache/etu-export-2026-10-17.json', progress: { items: 1, notes: 1 } });
    await waitFor(() => expect(RNFS.unlink).toHaveBeenCalledWith('/cache/etu-export-2026-10-17.json'));
    expect(saveDocuments).not.toHaveBeenCalled();
  });
});
