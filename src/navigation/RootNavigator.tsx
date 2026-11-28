import React, { useEffect, useState } from 'react';
import {
  NavigationContainer,
  StackActions,
  createNavigationContainerRef,
  type LinkingOptions,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TimelineScreen from '../screens/TimelineScreen';
import RandomScreen from '../screens/RandomScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NoteDetailScreen from '../screens/NoteDetailScreen';
import NoteEditScreen from '../screens/NoteEditScreen';
import SearchScreen from '../screens/SearchScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme';
import Icon, { type IconName } from '../components/Icon';
import { isReminderNotification } from '../reminders/notify';
import type { MainTabParamList, RootStackParamList } from './types';

/** Single root stack so deep links resolve whether user is on a tab or a pushed screen. */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['etu://open'],
  config: {
    initialRouteName: 'MainTabs',
    screens: {
      Login: 'login',
      Register: 'register',
      MainTabs: {
        path: '',
        screens: {
          Timeline: '',
          Random: 'random',
          Search: 'search',
          Settings: 'settings',
        },
      },
      NoteDetail: 'note/:noteId',
      NoteEdit: {
        path: 'edit',
        alias: ['capture'],
        // Only in-app buttons may open the camera or microphone.
        parse: { attach: () => undefined, note: () => undefined },
      },
    },
  },
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, IconName> = {
  Timeline: 'timeline',
  Random: 'random',
  Search: 'search',
  Settings: 'settings',
};

function MainTabs() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: 24, fontWeight: '600' },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 0,
          height: 80 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 4 },
        tabBarLabelPosition: 'below-icon',
        tabBarIconStyle: { width: 64, height: 32 },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused }) => (
          <View
            style={[
              styles.indicator,
              {
                backgroundColor: focused
                  ? colors.primaryContainer
                  : 'transparent',
              },
            ]}
          >
            <Icon
              name={tabIcons[route.name]}
              size={26}
              color={focused ? colors.onPrimaryContainer : colors.textSecondary}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Random" component={RandomScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, navigation: theme } = useAppTheme();
  const [ready, setReady] = useState(false);
  const tapped = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      !ready ||
      !isAuthenticated ||
      !tapped ||
      !isReminderNotification(tapped.notification.request.identifier)
    ) {
      return;
    }
    Notifications.clearLastNotificationResponse();
    navigationRef.dispatch(StackActions.push('NoteEdit', {}));
  }, [ready, isAuthenticated, tapped]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={theme}
      onReady={() => setReady(true)}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NoteDetail"
              component={NoteDetailScreen}
              options={{ title: 'Note' }}
            />
            <Stack.Screen
              name="NoteEdit"
              component={NoteEditScreen}
              options={({ route }) => ({
                title: route.params?.noteId ? 'Edit note' : 'New note',
                animation: route.params?.noteId
                  ? 'default'
                  : 'slide_from_bottom',
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
