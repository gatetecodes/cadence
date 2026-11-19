import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Mascot } from '../../components/Mascot';
import { Text } from '../../components/Text';
import { Card, Segmented, StatTile } from '../../components/ui';
import { useNow } from '../../components/useNow';
import { BADGES } from '../../engine/badges';
import { dailyBars, summarize, type DayBar } from '../../engine/stats';
import { addDays, formatHM, MINUTE } from '../../engine/time';
import { goalMinutesFor, useFastStore } from '../../store/useFastStore';
import { colors, radius } from '../../theme/tokens';

type Range = 'week' | 'month';
const CHART_H = 190;

type Bar = { key: string; label: string; hours: number; met: boolean; live: boolean };

function weekBars(bars: DayBar[]): Bar[] {
  return bars.map((b) => ({
    key: b.key,
    label: new Date(b.day).toLocaleDateString([], { weekday: 'short' }),
    hours: b.hours,
    met: b.metGoal,
    live: b.live,
  }));
}

/** Four weekly bars: average hours per fasting day, on goal when the average reaches it. */
function monthBars(bars: DayBar[], goalH: number): Bar[] {
  const out: Bar[] = [];
  for (let w = 0; w < 4; w++) {
    const days = bars.slice(w * 7, w * 7 + 7).filter((b) => b.hours > 0);
    const avg = days.length ? days.reduce((a, b) => a + b.hours, 0) / days.length : 0;
    out.push({ key: `w${w}`, label: `Wk ${w + 1}`, hours: avg, met: avg >= goalH, live: w === 3 });
  }
  return out;
}

export default function Progress() {
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const fasts = useFastStore((s) => s.fasts);
  const badges = useFastStore((s) => s.badges);
  const goalMinutes = useFastStore((s) => goalMinutesFor(s.settings));
  const goalH = goalMinutes / 60;
  // Leave headroom above the goal line so bars that beat it still read as taller.
  const maxH = Math.max(20, goalH + 4);
  const [range, setRange] = useState<Range>('week');

  const days = range === 'week' ? 7 : 28;
  const bars = useMemo(() => {
    const raw = dailyBars(fasts, days, now);
    return range === 'week' ? weekBars(raw) : monthBars(raw, goalH);
  }, [fasts, days, now, range, goalH]);
  const summary = useMemo(() => summarize(fasts, addDays(now, -(days - 1)), addDays(now, 1), now), [fasts, days, now]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.peach }}
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text variant="display" style={{ fontSize: 36 }}>
            Progress
          </Text>
          <Text variant="caption">{range === 'week' ? 'Last 7 days' : 'Last 4 weeks'}</Text>
        </View>
        <Segmented<Range>
          options={[
            { id: 'week', label: 'Weekly' },
            { id: 'month', label: 'Monthly' },
          ]}
          value={range}
          onChange={setRange}
        />
      </View>

      <Card style={{ gap: 16 }}>
        <View style={styles.row}>
          <View style={styles.badgeIcon}>
            <Icon name="chart" color={colors.inkOnDark} />
          </View>
          <Text variant="number" style={{ fontSize: 30 }}>
            {summary.fasts}
          </Text>
          <Text variant="label" style={{ color: colors.inkMuted }}>
            fasts
          </Text>
          <Text variant="number" style={{ fontSize: 30, marginLeft: 8 }}>
            {Math.round(summary.totalHours)}h
          </Text>
          <Text variant="label" style={{ color: colors.inkMuted }}>
            fasted
          </Text>
        </View>

        <View style={{ height: CHART_H }} accessibilityRole="image" accessibilityLabel="Hours fasted per day">
          <View style={[styles.goalLine, { bottom: (goalH / maxH) * CHART_H }]} />
          <Text variant="caption" style={[styles.goalLabel, { bottom: (goalH / maxH) * CHART_H + 4 }]}>
            {formatHM(goalMinutes * MINUTE)} goal
          </Text>
          <View style={styles.bars}>
            {bars.map((b) => {
              const h = Math.max((Math.min(b.hours, maxH) / maxH) * CHART_H, b.hours > 0 ? 34 : 6);
              const cap = b.live ? colors.lavender : b.met ? colors.orange : colors.yellow;
              const body = b.live ? '#E3DEFB' : b.met ? '#FAD3B3' : '#FCEBBD';
              return (
                <View key={b.key} style={[styles.bar, { height: h, backgroundColor: body, width: range === 'week' ? 34 : 56 }]}>
                  {b.hours > 0 && (
                    <View style={[styles.cap, { backgroundColor: cap }]}>
                      <Text variant="label" style={{ fontSize: 13 }}>
                        {b.hours.toFixed(b.hours % 1 === 0 ? 0 : 1)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
        <View style={styles.labels}>
          {bars.map((b) => (
            <Text key={b.key} variant="caption" style={{ width: range === 'week' ? 34 : 56, textAlign: 'center' }}>
              {b.label}
            </Text>
          ))}
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile label="Average" icon="clock" value={`${summary.averageHours.toFixed(1)}h`} bg={colors.lavenderTint} />
        <StatTile label="On goal" icon="check" value={`${summary.onGoal}/${summary.completed}`} bg={colors.yellow} />
        <StatTile label="Longest" icon="trophy" value={`${summary.longestHours.toFixed(1)}h`} bg={colors.orangeTint} />
      </View>

      <View style={styles.badgesRow}>
        <View style={styles.mascotWrap}>
          <Mascot size={40} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="label" style={{ fontSize: 16 }}>
            Badges earned
          </Text>
          <Text variant="caption">
            {badges.size} of {BADGES.length}
          </Text>
        </View>
        <View style={styles.row}>
          {BADGES.filter((b) => badges.has(b.key))
            .slice(0, 3)
            .map((b, i) => (
              <View
                key={b.key}
                accessibilityLabel={b.title}
                style={[styles.badge, { marginLeft: i === 0 ? 0 : -10, backgroundColor: [colors.orange, colors.green, colors.lavender][i] }]}
              >
                <Icon name="trophy" size={15} color={colors.ink} />
              </View>
            ))}
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/history')} style={styles.historyLink}>
        <Icon name="list" color={colors.ink} />
        <Text variant="label" style={{ flex: 1 }}>
          All fasts
        </Text>
        <Icon name="arrow-right" size={18} color={colors.ink} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#CDBFB3' },
  goalLabel: { position: 'absolute', right: 0, fontSize: 12 },
  bars: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  bar: { borderRadius: 17, overflow: 'hidden' },
  cap: { height: 30, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  labels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: -6 },
  tiles: { flexDirection: 'row', gap: 10 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 10, paddingRight: 14 },
  mascotWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.orangeTint, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16 },
});
