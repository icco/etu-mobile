import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Reminders from '../src/components/Reminders';
import { timeOfDay } from '../src/reminders/model';
import { loadReminders, saveReminders } from '../src/reminders/store';

const n = Notifications as jest.Mocked<typeof Notifications>;
const write = {
  id: 'a',
  label: 'Write a post',
  hour: 9,
  minute: 0,
  enabled: true,
};

// The first render loads React Native lazily and takes over 5s on CI runners.
jest.setTimeout(30000);

beforeEach(async () => {
  jest.clearAllMocks();
  n.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  } as Notifications.NotificationPermissionsStatus);
  await AsyncStorage.clear();
});

it('adds a reminder and schedules a daily notification', async () => {
  const { getByLabelText, getByText } = await render(<Reminders />);
  await fireEvent.press(getByLabelText('New reminder time'));
  const [{ onValueChange }] = (DateTimePickerAndroid.open as jest.Mock).mock
    .calls[0] as [{ onValueChange: (event: object, date: Date) => void }];
  await act(() => onValueChange({}, timeOfDay(7, 45)));
  await fireEvent.changeText(getByLabelText('New reminder'), ' Write a post ');
  await fireEvent.press(getByText('Add reminder'));
  await waitFor(() => expect(n.scheduleNotificationAsync).toHaveBeenCalled());
  const saved = await loadReminders();
  expect(saved).toEqual([
    {
      id: saved[0].id,
      label: 'Write a post',
      hour: 7,
      minute: 45,
      enabled: true,
    },
  ]);
  expect(n.scheduleNotificationAsync).toHaveBeenCalledWith({
    identifier: `reminder:${saved[0].id}`,
    content: {
      title: 'Write a post',
      data: { zone: expect.any(String) as string },
    },
    trigger: { type: 'daily', hour: 7, minute: 45, channelId: 'reminders' },
  });
  expect(getByText('Write a post')).toBeTruthy();
});

it('ignores a blank reminder', async () => {
  const { getByText } = await render(<Reminders />);
  await fireEvent.press(getByText('Add reminder'));
  expect(await loadReminders()).toEqual([]);
  expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('pauses and deletes a reminder', async () => {
  await saveReminders([write]);
  const { findByLabelText, getByLabelText, queryByText } = await render(
    <Reminders />,
  );
  await fireEvent(
    await findByLabelText('Write a post on'),
    'valueChange',
    false,
  );
  await waitFor(async () =>
    expect(await loadReminders()).toEqual([{ ...write, enabled: false }]),
  );
  expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
  await fireEvent.press(getByLabelText('Delete Write a post'));
  await waitFor(() => expect(queryByText('Write a post')).toBeNull());
  expect(await loadReminders()).toEqual([]);
});

it('points to system settings when notifications are denied', async () => {
  n.getPermissionsAsync.mockResolvedValue({
    granted: false,
    canAskAgain: false,
  } as Notifications.NotificationPermissionsStatus);
  const { getByLabelText, getByText, findByText } = await render(<Reminders />);
  await fireEvent.changeText(getByLabelText('New reminder'), 'Stretch');
  await fireEvent.press(getByText('Add reminder'));
  expect(await findByText(/Notifications are off for Etu/)).toBeTruthy();
});

it('shows the warning again when reopened with notifications denied', async () => {
  await saveReminders([write]);
  n.getPermissionsAsync.mockResolvedValueOnce({
    granted: false,
    canAskAgain: false,
  } as Notifications.NotificationPermissionsStatus);
  const { findByText } = await render(<Reminders />);
  expect(await findByText(/Notifications are off for Etu/)).toBeTruthy();
});
