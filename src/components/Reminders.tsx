import React, { useEffect, useState } from 'react';
import {
  AppState,
  Linking,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { formatTime, timeOfDay } from '../reminders/model';
import type { Reminder } from '../reminders/model';
import { changeReminders, hasPermission } from '../reminders/notify';
import { loadReminders, saveReminders } from '../reminders/store';
import { getErrorMessage } from '../utils/errors';
import { useAppTheme, useThemedStyles, type Colors } from '../theme';

function pickTime(
  hour: number,
  minute: number,
  onPick: (hour: number, minute: number) => void,
) {
  DateTimePickerAndroid.open({
    mode: 'time',
    value: timeOfDay(hour, minute),
    onValueChange: (_event, date) => onPick(date.getHours(), date.getMinutes()),
  });
}

const store = { load: loadReminders, save: saveReminders };

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export default function Reminders() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [label, setLabel] = useState('');
  const [time, setTime] = useState({ hour: 9, minute: 0 });
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReminders()
      .then(async loaded => {
        setReminders(loaded);
        if (loaded.some(r => r.enabled)) {
          setBlocked(!(await hasPermission()));
        }
      })
      .catch((e: unknown) => setError(getErrorMessage(e)));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        hasPermission()
          .then(granted => setBlocked(was => was && !granted))
          .catch((e: unknown) => setError(getErrorMessage(e)));
      }
    });
    return () => sub.remove();
  }, []);

  const apply = async (
    change: (list: Reminder[]) => Reminder[],
    needsPermission: boolean,
  ) => {
    setError(null);
    try {
      const done = await changeReminders(store, change, needsPermission);
      setReminders(done.reminders);
      if (done.granted !== undefined) setBlocked(!done.granted);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const update = (id: string, patch: Partial<Reminder>) =>
    apply(
      list => list.map(r => (r.id === id ? { ...r, ...patch } : r)),
      patch.enabled === true,
    );

  const add = async () => {
    const text = label.trim();
    if (!text) return;
    setLabel('');
    const added = { id: newId(), label: text, ...time, enabled: true };
    await apply(list => [...list, added], true);
  };

  return (
    <View style={styles.card}>
      {reminders.map(r => (
        <View key={r.id} style={styles.row}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Change time for ${r.label}`}
            style={styles.time}
            onPress={() =>
              pickTime(r.hour, r.minute, (hour, minute) => {
                void update(r.id, { hour, minute });
              })
            }
          >
            <Text style={styles.timeText}>{formatTime(r.hour, r.minute)}</Text>
          </TouchableOpacity>
          <Text style={styles.name}>{r.label}</Text>
          <Switch
            accessibilityLabel={`${r.label} on`}
            value={r.enabled}
            onValueChange={enabled => {
              void update(r.id, { enabled });
            }}
            trackColor={{ false: colors.outline, true: colors.primary }}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Delete ${r.label}`}
            style={styles.remove}
            onPress={() => {
              void apply(list => list.filter(x => x.id !== r.id), false);
            }}
          >
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.row}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="New reminder time"
          style={styles.time}
          onPress={() =>
            pickTime(time.hour, time.minute, (hour, minute) =>
              setTime({ hour, minute }),
            )
          }
        >
          <Text style={styles.timeText}>
            {formatTime(time.hour, time.minute)}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Remind me to..."
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="New reminder"
          value={label}
          onChangeText={setLabel}
          onSubmitEditing={() => {
            void add();
          }}
          returnKeyType="done"
        />
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.addBtn}
        onPress={() => {
          void add();
        }}
      >
        <Text style={styles.addBtnText}>Add reminder</Text>
      </TouchableOpacity>
      {blocked ? (
        <TouchableOpacity
          accessibilityRole="link"
          onPress={() => {
            Linking.openSettings().catch((e: unknown) =>
              setError(getErrorMessage(e)),
            );
          }}
        >
          <Text style={styles.notice}>
            Notifications are off for Etu. Tap to open system settings.
          </Text>
        </TouchableOpacity>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      padding: 20,
      borderRadius: 16,
      backgroundColor: colors.surface,
      gap: 12,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    time: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: 12,
      minHeight: 48,
      minWidth: 96,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeText: {
      color: colors.text,
      fontSize: 16,
      fontVariant: ['tabular-nums'],
    },
    name: { flex: 1, color: colors.text, fontSize: 16 },
    remove: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeText: { color: colors.textSecondary, fontSize: 18 },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceRaised,
      borderRadius: 12,
      minHeight: 48,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
    },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 28,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
    notice: {
      color: colors.primary,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
    error: { color: colors.error, fontSize: 14 },
  });
