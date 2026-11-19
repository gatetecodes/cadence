import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Icon } from '../../components/Icon';
import { Text } from '../../components/Text';
import { Segmented } from '../../components/ui';
import { useNow } from '../../components/useNow';
import { snapshot } from '../../engine/fast';
import { zoneHours } from '../../engine/stats';
import { addDays, formatHM, MINUTE } from '../../engine/time';
import { ZONES } from '../../engine/zones';
import { useFastStore } from '../../store/useFastStore';
import { colors, radius } from '../../theme/tokens';

type Range = 'week' | 'month';

/** Wedges fanning out from (cx, cy) across `span` degrees, sized by value. */
function fanPaths(values: number[], cx: number, cy: number, r: number, span = 200) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let a = -span / 2;
  return values.map((v) => {
    const b = a + (v / total) * span;
    const p = (deg: number) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
    const [x1, y1] = p(a);
    const [x2, y2] = p(b);
    const large = b - a > 180 ? 1 : 0;
    const d = `M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    a = b;
    return d;
  });
}

export default function Zones() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const now = useNow(60_000);
  const fasts = useFastStore((s) => s.fasts);
  const active = useFastStore((s) => s.active);
  const [range, setRange] = useState<Range>('week');

  const from = addDays(now, range === 'week' ? -6 : -27);
  const hours = useMemo(() => zoneHours(fasts, from, addDays(now, 1), now), [fasts, from, now]);
  const values = ZONES.map((z) => hours[z.id]);
  const total = values.reduce((a, b) => a + b, 0);
  const snap = active ? snapshot(active, now) : null;

  const panelH = 300;
  const cx = width / 2;
  const cy = 190;
  const paths = fanPaths(values, cx, cy, width * 1.6);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <View style={styles.top}>
        <View style={styles.rowBetween}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to home" onPress={() => router.navigate('/')} style={styles.back}>
            <Icon name="chevron-left" color={colors.ink} />
          </Pressable>
          <Segmented<Range>
            options={[
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
            ]}
            value={range}
            onChange={setRange}
          />
        </View>
        <Text variant="display">Fasting Zones</Text>
        <Text variant="body" style={{ color: colors.inkMuted }}>
          <Text variant="label" style={{ fontSize: 16 }}>
            {Math.round(total)}h
          </Text>{' '}
          fasted {range === 'week' ? 'in the last 7 days' : 'in the last 4 weeks'}.
        </Text>
        <View style={styles.legend}>
          {ZONES.map((z, i) => (
            <View key={z.id} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: z.color }]} />
              <Text variant="label">
                {z.label} · {Math.round(values[i])}h
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 110 }]}>
        <Svg width={width} height={panelH} style={StyleSheet.absoluteFill} accessibilityLabel="Hours in each zone">
          {total > 0 && paths.map((d, i) => <Path key={ZONES[i].id} d={d} fill={ZONES[i].color} />)}
        </Svg>
        <View style={{ height: cy - 48 }} />
        <View style={styles.hub}>
          <Icon name="flame" size={34} color={colors.orange} filled />
        </View>

        <View style={[styles.tip, { backgroundColor: snap ? colors.yellow : colors.surface }]}>
          <View style={styles.rowGap}>
            <View style={styles.tag}>
              <Text variant="label" style={{ color: colors.yellow, fontSize: 12 }}>
                Tip
              </Text>
            </View>
            <Text variant="label" style={{ fontSize: 17, flex: 1 }}>
              {snap ? `You're in ${snap.zone.label}` : 'Not fasting right now'}
            </Text>
          </View>
          <Text variant="body" style={{ fontSize: 14, color: '#4A3020' }}>
            {snap
              ? `${formatHM(snap.elapsedMs - snap.zone.startH * 60 * MINUTE)} in this zone. ${snap.zone.tip}${
                  snap.nextZone && snap.msToNextZone ? ` ${snap.nextZone.label} in about ${formatHM(snap.msToNextZone)}.` : ''
                }`
              : 'Start a fast to see which zone you are in and what is happening.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 24, gap: 12, paddingBottom: 20 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '45%' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  panel: {
    flex: 1,
    backgroundColor: colors.mocha,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    overflow: 'hidden',
    alignItems: 'center',
  },
  hub: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: { alignSelf: 'stretch', marginHorizontal: 20, marginTop: 16, borderRadius: radius.lg, padding: 16, gap: 6 },
  tag: { backgroundColor: colors.ink, borderRadius: 12, paddingHorizontal: 10, height: 24, justifyContent: 'center' },
});
