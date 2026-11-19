import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { Text } from '../components/Text';
import { TimeEditSheet, VALIDATION_MESSAGES } from '../components/TimeEditSheet';
import { IconButton } from '../components/ui';
import { durationMs, metGoal, type Fast } from '../engine/fast';
import { ratioFor } from '../engine/plans';
import { formatHM, formatTime } from '../engine/time';
import { useFastStore } from '../store/useFastStore';
import { colors, radius } from '../theme/tokens';

type Editing = { fast: Fast; field: 'start' | 'end' } | null;

export default function History() {
  const insets = useSafeAreaInsets();
  const all = useFastStore((s) => s.fasts);
  const fasts = useMemo(() => all.filter((f) => f.endedAt !== null), [all]);
  const { editFast, deleteFast } = useFastStore.getState();
  const [editing, setEditing] = useState<Editing>(null);

  const confirmDelete = (f: Fast) =>
    Alert.alert('Delete this fast?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFast(f.id) },
    ]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text variant="display" style={{ fontSize: 32 }}>
          History
        </Text>
      </View>

      <FlatList
        data={fasts}
        keyExtractor={(f) => String(f.id)}
        contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: insets.bottom + 40 }}
        ListEmptyComponent={
          <Text variant="body" style={{ color: colors.inkMuted, textAlign: 'center', marginTop: 40 }}>
            Finished fasts show up here.
          </Text>
        }
        renderItem={({ item: f }) => {
          const ok = metGoal(f);
          return (
            <View style={styles.row}>
              <View style={[styles.badge, { backgroundColor: ok ? colors.orange : colors.yellowTint }]}>
                <Icon name={ok ? 'check' : 'clock'} size={18} color={colors.ink} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label" style={{ fontSize: 16 }}>
                  {formatHM(durationMs(f, f.endedAt!))} · {ratioFor(f.goalMinutes)}
                </Text>
                <View style={styles.times}>
                  <Pressable accessibilityRole="button" accessibilityHint="Edit start time" onPress={() => setEditing({ fast: f, field: 'start' })}>
                    <Text variant="caption" style={styles.link}>
                      {new Date(f.startedAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                      {formatTime(f.startedAt)}
                    </Text>
                  </Pressable>
                  <Text variant="caption">→</Text>
                  <Pressable accessibilityRole="button" accessibilityHint="Edit end time" onPress={() => setEditing({ fast: f, field: 'end' })}>
                    <Text variant="caption" style={styles.link}>
                      {formatTime(f.endedAt!)}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <IconButton icon="trash" label="Delete fast" onPress={() => confirmDelete(f)} color={colors.inkMuted} />
            </View>
          );
        }}
      />

      {editing && (
        <TimeEditSheet
          visible
          title={editing.field === 'start' ? 'Started at' : 'Ended at'}
          value={editing.field === 'start' ? editing.fast.startedAt : editing.fast.endedAt!}
          onClose={() => setEditing(null)}
          onSave={(ts) => {
            const { fast, field } = editing;
            const err = field === 'start' ? editFast(fast.id, ts, fast.endedAt!) : editFast(fast.id, fast.startedAt, ts);
            return err ? VALIDATION_MESSAGES[err] : null;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  times: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { textDecorationLine: 'underline' },
});
