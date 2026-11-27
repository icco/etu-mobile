import AsyncStorage from '@react-native-async-storage/async-storage';
import { byTime, parseReminders } from './model';
import type { Reminder } from './model';

const KEY = 'etu.reminders';

export async function loadReminders(): Promise<Reminder[]> {
  return parseReminders(await AsyncStorage.getItem(KEY)).sort(byTime);
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(reminders));
}
