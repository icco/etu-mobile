import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { Note } from '../api/client';

export type RootStackParamList = {
  MainTabs: undefined;
  NoteDetail: { noteId: string };
  NoteEdit: { noteId?: string; note?: Note; initialContent?: string };
  Search: undefined;
};

export type MainTabParamList = {
  Timeline: undefined;
  Capture: undefined;
  Random: undefined;
  Search: undefined;
  Settings: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type MainTabNavigationProp<T extends keyof MainTabParamList> =
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, T>,
    RootStackNavigationProp
  >;

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type -- React Navigation param list augmentation */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
