import React from 'react';
import { render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import RootNavigator from '../src/navigation/RootNavigator';

let mockAuthenticated = true;
const mockNavigate = jest.fn();

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthenticated, isLoading: false }),
}));

jest.mock('@react-navigation/native', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const ref = {
    navigate: (...args: unknown[]): unknown => mockNavigate(...args),
    isReady: () => true,
  };
  return {
    NavigationContainer: function NavigationContainer({
      children,
      onReady,
    }: {
      children: React.ReactNode;
      onReady: () => void;
    }) {
      mockReact.useEffect(() => onReady(), [onReady]);
      return children;
    },
    createNavigationContainerRef: () => ref,
  };
});

const n = Notifications as jest.Mocked<typeof Notifications>;
const tap = (identifier: string) =>
  ({
    notification: { request: { identifier } },
  }) as Notifications.NotificationResponse;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = true;
});
afterEach(() => n.useLastNotificationResponse.mockReturnValue(null));

it('opens a new note when a reminder is tapped', async () => {
  n.useLastNotificationResponse.mockReturnValue(tap('reminder:a'));
  await render(<RootNavigator />);
  expect(mockNavigate).toHaveBeenCalledWith('NoteEdit', {});
  expect(n.clearLastNotificationResponse).toHaveBeenCalled();
});

it('leaves other notifications and signed-out taps alone', async () => {
  n.useLastNotificationResponse.mockReturnValue(tap('other'));
  await render(<RootNavigator />);
  mockAuthenticated = false;
  n.useLastNotificationResponse.mockReturnValue(tap('reminder:a'));
  await render(<RootNavigator />);
  expect(mockNavigate).not.toHaveBeenCalled();
});
