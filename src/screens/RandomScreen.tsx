import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getRandomNotes } from '../api/notes';
import NoteCard from '../components/NoteCard';
import { isAuthError, getErrorMessage } from '../utils/errors';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';
import NewNoteButton from '../components/NewNoteButton';
import Icon from '../components/Icon';

const RANDOM_COUNT = 5;

export default function RandomScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { user, token, handleAuthError } = useAuth();
  const {
    data: notes = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['randomNotes', user?.id],
    queryFn: () => getRandomNotes(user!.id, token!, RANDOM_COUNT),
    enabled: !!user?.id && !!token,
  });

  // Handle auth errors
  React.useEffect(() => {
    if (error && isAuthError(error)) {
      void handleAuthError();
    }
  }, [error, handleAuthError]);

  if (!user || !token) return null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load random notes</Text>
        <Text style={styles.errorDetail}>{getErrorMessage(error)}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.shuffle}
          onPress={() => {
            void refetch();
          }}
        >
          <Text style={styles.shuffleText}>Try again</Text>
        </Pressable>
        <NewNoteButton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notes}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.title}>A little rediscovery</Text>
            <Text style={styles.header}>
              Return to a thought you left behind.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isRefetching }}
              disabled={isRefetching}
              onPress={() => {
                void refetch();
              }}
              style={styles.shuffle}
              android_ripple={{ color: colors.ripple }}
            >
              <Icon name="random" size={20} color={colors.onPrimaryContainer} />
              <Text style={styles.shuffleText}>
                {isRefetching ? 'Shuffling…' : 'Shuffle notes'}
              </Text>
            </Pressable>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() =>
              (
                navigation as {
                  navigate: (name: string, params?: object) => void;
                }
              ).navigate('NoteDetail', { noteId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptyHint}>
              Tap New note to start your collection.
            </Text>
          </View>
        }
      />
      <NewNoteButton />
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    list: { paddingVertical: 8, paddingBottom: 96 },
    intro: { padding: 24, paddingTop: 12 },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 8,
    },
    shuffle: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
      minHeight: 48,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 24,
      backgroundColor: colors.primaryContainer,
      overflow: 'hidden',
    },
    shuffleText: {
      color: colors.onPrimaryContainer,
      fontSize: 14,
      fontWeight: '600',
    },
    header: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },
    empty: { padding: 48, alignItems: 'center' },
    emptyText: { color: colors.text, fontSize: 18 },
    emptyHint: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    errorText: { color: colors.error, fontSize: 18, marginBottom: 8 },
    errorDetail: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
  });
