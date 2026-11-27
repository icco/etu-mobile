import React from 'react';
import { render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import RootNavigator from '../src/navigation/RootNavigator';

let mockAuthenticated = true;
const mockDispatch = jest.fn();

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthenticated, isLoading: false }),
}));

jest.mock('@react-navigation/native', () => {
  const mockReact = jest.requireActual<typeof React>('react');
  const ref = {
    dispatch: (...args: unknown[]): unknown => mockDispatch(...args),
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
    StackActions: {
      push: (name: string, params: object) => ({ type: 'PUSH', name, params }),
    },
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
  expect(mockDispatch).toHaveBeenCalledWith({
    type: 'PUSH',
    name: 'NoteEdit',
    params: {},
  });
  expect(n.clearLastNotificationResponse).toHaveBeenCalled();
});

it('leaves other notifications and signed-out taps alone', async () => {
  n.useLastNotificationResponse.mockReturnValue(tap('other'));
  await render(<RootNavigator />);
  mockAuthenticated = false;
  n.useLastNotificationResponse.mockReturnValue(tap('reminder:a'));
  await render(<RootNavigator />);
  expect(mockDispatch).not.toHaveBeenCalled();
});
