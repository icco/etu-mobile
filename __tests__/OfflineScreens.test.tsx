/**
 * @format
 */

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ConnectError, Code } from '@connectrpc/connect';
import CaptureScreen from '../src/screens/CaptureScreen';
import TimelineScreen from '../src/screens/TimelineScreen';
import NoteEditScreen from '../src/screens/NoteEditScreen';
import { clearQueue, enqueueNote } from '../src/api/offlineQueue';
import { createNote } from '../src/api/notes';

jest.mock('../src/api/notes', () => ({
  createNote: jest.fn(),
  getNote: jest.fn(),
  updateNote: jest.fn(),
  listNotes: jest.fn(),
  listTags: jest.fn(),
}));
jest.mock('../src/utils/logger');
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'alice' },
    token: 'token',
    handleAuthError: jest.fn(),
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQuery: jest.fn(),
  useInfiniteQuery: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn(), resetQueries: jest.fn() }),
}));

const mockedCreateNote = jest.mocked(createNote);

beforeEach(async () => {
  jest.clearAllMocks();
  await clearQueue();
  jest.mocked(useQuery).mockReturnValue({
    data: [],
    isLoading: false,
  } as unknown as ReturnType<typeof useQuery>);
  jest.mocked(useInfiniteQuery).mockReturnValue({
    data: { pages: [{ notes: [], total: 0, limit: 50, offset: 0 }] },
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    error: null,
  } as unknown as ReturnType<typeof useInfiniteQuery>);
});

const queueOne = () =>
  enqueueNote({ userId: 'alice', content: 'offline', tags: [] });

describe('CaptureScreen', () => {
  it('shows nothing when there are no pending notes', async () => {
    const { queryByText } = await render(<CaptureScreen />);
    expect(queryByText(/waiting to sync/)).toBeNull();
  });

  it('shows the pending count once a note is saved offline', async () => {
    const { findByText, queryByText } = await render(<CaptureScreen />);
    expect(queryByText(/waiting to sync/)).toBeNull();
    await act(async () => {
      await queueOne();
    });
    expect(await findByText('1 note saved offline, waiting to sync')).toBeTruthy();
    await act(async () => {
      await queueOne();
    });
    expect(await findByText('2 notes saved offline, waiting to sync')).toBeTruthy();
  });
});

describe('TimelineScreen', () => {
  it('shows a pending banner for queued notes', async () => {
    await queueOne();
    const { findByText } = await render(<TimelineScreen />);
    expect(await findByText('1 note saved offline, waiting to sync')).toBeTruthy();
  });

  it('hides the banner when the queue is empty', async () => {
    const { queryByText } = await render(<TimelineScreen />);
    expect(queryByText(/waiting to sync/)).toBeNull();
  });
});

describe('NoteEditScreen', () => {
  const save = async () => {
    const screen = await render(<NoteEditScreen />);
    await fireEvent.changeText(screen.getByLabelText('Note content'), 'hello');
    await fireEvent.press(screen.getByText('Create note'));
    return screen;
  };

  it('tells the user when a note was saved offline', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockedCreateNote.mockRejectedValue(new ConnectError('down', Code.Unavailable));
    await save();
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Saved offline', expect.any(String)),
    );
  });

  it('surfaces permission errors instead of queueing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockedCreateNote.mockRejectedValue(
      new ConnectError('subscription required', Code.PermissionDenied),
    );
    await save();
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Error', expect.any(String)),
    );
    expect(alert).not.toHaveBeenCalledWith('Saved offline', expect.anything());
  });
});
