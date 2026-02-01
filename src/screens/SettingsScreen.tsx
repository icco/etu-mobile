import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      {user ? (
        <Text style={styles.text}>{user.email}</Text>
      ) : (
        <Text style={styles.text}>Settings</Text>
      )}
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#111' },
  text: { color: '#fff', fontSize: 18, marginBottom: 24 },
  button: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  buttonText: { color: '#fff', fontSize: 16 },
});
