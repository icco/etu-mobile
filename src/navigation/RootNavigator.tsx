import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TimelineScreen from '../screens/TimelineScreen';
import CaptureScreen from '../screens/CaptureScreen';
import RandomScreen from '../screens/RandomScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NoteDetailScreen from '../screens/NoteDetailScreen';
import NoteEditScreen from '../screens/NoteEditScreen';
import SearchScreen from '../screens/SearchScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#111', borderTopColor: '#333' },
        tabBarActiveTintColor: '#0a84ff',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Capture" component={CaptureScreen} />
      <Tab.Screen name="Random" component={RandomScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#111' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
      <Stack.Screen name="NoteEdit" component={NoteEditScreen} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#111' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#0a84ff" />
    </View>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
});
