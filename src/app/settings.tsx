import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import type { ReactNode } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../components/Text';
import { IconButton, Stepper } from '../components/ui';
import { exportAll, fastsRepo } from '../db/repo';
import { fastsToCsv } from '../engine/export';
import type { NotificationPrefs } from '../engine/notificationPlan';
import { CUSTOM_GOAL_HOURS, planById, ratioFor } from '../engine/plans';
import { goalMinutesFor, useFastStore } from '../store/useFastStore';
import { colors, radius } from '../theme/tokens';

function Row({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" style={{ fontSize: 16 }}>
          {title}
        </Text>
        {subtitle && <Text variant="caption">{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

/** Writes `contents` to a cache file and opens the share sheet for it. */
async function shareFile(name: string, contents: string, mimeType: string, UTI: string) {
  try {
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    file.write(contents);
    await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: 'Export Cadence data' });
  } catch (e) {
    console.warn('[cadence] export failed', e);
    Alert.alert('Export failed', 'Cadence could not create the export file. Please try again.');
  }
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.orange, false: colors.line }} thumbColor={colors.surface} />;
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const settings = useFastStore((s) => s.settings);
  const updateSettings = useFastStore((s) => s.updateSettings);
  const setCustomGoal = useFastStore((s) => s.setCustomGoal);
  const eraseAllData = useFastStore((s) => s.eraseAllData);
  const goalH = goalMinutesFor(settings) / 60;
  const isCustom = settings.customGoalMinutes !== null;

  const setPref = (key: keyof NotificationPrefs, v: boolean) =>
    updateSettings({ notifications: { ...settings.notifications, [key]: v } });

  const stamp = () => new Date().toISOString().slice(0, 10);
  const exportJson = () =>
    shareFile(`cadence-export-${stamp()}.json`, JSON.stringify(exportAll(), null, 2), 'application/json', 'public.json');
  const exportCsv = () =>
    shareFile(`cadence-fasts-${stamp()}.csv`, fastsToCsv(fastsRepo.all()), 'text/csv', 'public.comma-separated-values-text');

  const reset = () =>
    Alert.alert('Erase all data?', 'Every fast, water log, badge and setting will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: () => void eraseAllData(),
      },
    ]);

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text variant="display" style={{ fontSize: 32 }}>
          Settings
        </Text>
      </View>

      <Text variant="caption" style={styles.section}>
        FASTING
      </Text>
      <View style={styles.group}>
        <Row
          title={`Goal · ${goalH}h`}
          subtitle={`${ratioFor(goalH * 60)} · ${isCustom ? 'Custom goal' : `${planById(settings.planId).name} plan`}`}
        >
          <Stepper
            decrementLabel="Shorter fasting goal"
            incrementLabel="Longer fasting goal"
            canDecrement={goalH > CUSTOM_GOAL_HOURS.min}
            canIncrement={goalH < CUSTOM_GOAL_HOURS.max}
            onDecrement={() => setCustomGoal((goalH - 1) * 60)}
            onIncrement={() => setCustomGoal((goalH + 1) * 60)}
          />
        </Row>
      </View>

      <Text variant="caption" style={styles.section}>
        NOTIFICATIONS
      </Text>
      <View style={styles.group}>
        <Row title="Zone changes" subtitle="At 4h, 12h and 16h">
          <Toggle value={settings.notifications.zoneAlerts} onChange={(v) => setPref('zoneAlerts', v)} />
        </Row>
        <Row title="Almost there" subtitle="30 minutes before your goal">
          <Toggle value={settings.notifications.almostThere} onChange={(v) => setPref('almostThere', v)} />
        </Row>
        <Row title="Goal reached">
          <Toggle value={settings.notifications.goalReached} onChange={(v) => setPref('goalReached', v)} />
        </Row>
        <Row title="Eating window closing" subtitle="30 minutes before it ends">
          <Toggle value={settings.notifications.windowClosing} onChange={(v) => setPref('windowClosing', v)} />
        </Row>
        <Row title="Daily start reminder" subtitle={settings.dailyReminder ? `Every day at ${settings.dailyReminder.hour}:${String(settings.dailyReminder.minute).padStart(2, '0')}` : 'Off'}>
          <Toggle value={settings.dailyReminder !== null} onChange={(v) => updateSettings({ dailyReminder: v ? { hour: 20, minute: 0 } : null })} />
        </Row>
        <Row title="Eating window on lock screen" subtitle="Count down to your next fast after you eat">
          <Toggle value={settings.liveEatingWindow} onChange={(v) => updateSettings({ liveEatingWindow: v })} />
        </Row>
        {Platform.OS === 'android' && (
          <Row title="Keep live timer pinned" subtitle="Bring the timer notification back if it is swiped away">
            <Toggle value={settings.repostLiveOnDismiss} onChange={(v) => updateSettings({ repostLiveOnDismiss: v })} />
          </Row>
        )}
      </View>

      <Text variant="caption" style={styles.section}>
        WATER
      </Text>
      <View style={styles.group}>
        <Row title="Daily goal" subtitle={`${settings.waterGoalMl / 1000} L`}>
          <Stepper
            decrementLabel="Lower water goal"
            incrementLabel="Raise water goal"
            canDecrement={settings.waterGoalMl > 1000}
            canIncrement={settings.waterGoalMl < 5000}
            onDecrement={() => updateSettings({ waterGoalMl: Math.max(1000, settings.waterGoalMl - 250) })}
            onIncrement={() => updateSettings({ waterGoalMl: Math.min(5000, settings.waterGoalMl + 250) })}
          />
        </Row>
      </View>

      <Text variant="caption" style={styles.section}>
        YOUR DATA
      </Text>
      <View style={styles.group}>
        <Pressable accessibilityRole="button" onPress={() => void exportJson()}>
          <Row title="Export everything as JSON" subtitle="Everything stays on this phone unless you share it" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void exportCsv()}>
          <Row title="Export fasts as CSV" subtitle="Opens in any spreadsheet app" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={reset}>
          <Row title="Erase all data" />
        </Pressable>
      </View>

      <Text variant="caption" style={{ textAlign: 'center', marginTop: 12 }}>
        Cadence gives general information, not medical advice.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  section: { marginTop: 14, marginLeft: 4, letterSpacing: 0.8 },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 64,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
});
