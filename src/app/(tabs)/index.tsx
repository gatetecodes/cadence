import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Mascot } from '../../components/Mascot';
import { Text } from '../../components/Text';
import { TimeEditSheet, VALIDATION_MESSAGES } from '../../components/TimeEditSheet';
import { Card, IconButton, PillButton } from '../../components/ui';
import { useNow } from '../../components/useNow';
import { ZoneRing } from '../../components/ZoneRing';
import { BADGES } from '../../engine/badges';
import { eatingSnapshot, metGoal, snapshot } from '../../engine/fast';
import { ratioFor } from '../../engine/plans';
import { currentStreak, dailyBars } from '../../engine/stats';
import { formatClock, formatHM, formatRelativeDayTime, HOUR, MINUTE } from '../../engine/time';
import { goalMinutesFor, useFastStore } from '../../store/useFastStore';
import { colors, EATING_COLOR, radius } from '../../theme/tokens';

function greeting(now: number) {
  const h = new Date(now).getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const active = useFastStore((s) => s.active);
  const fasts = useFastStore((s) => s.fasts);
  const settings = useFastStore((s) => s.settings);
  const justEnded = useFastStore((s) => s.justEnded);
  const freshBadges = useFastStore((s) => s.freshBadges);
  const waterTodayMl = useFastStore((s) => s.waterTodayMl);
  const { startFast, endFast, editActiveStart, editFast, addWater, undoWater, dismissCelebration } = useFastStore.getState();
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);

  const goalMinutes = active?.goalMinutes ?? goalMinutesFor(settings);
  const snap = active ? snapshot(active, now) : null;
  // Between fasts: the eating window opened by the last fast, then "closed" until a day has passed.
  const eating = active ? null : eatingSnapshot(fasts, now);
  const celebrating = justEnded && !active ? justEnded : null;
  // The streak only changes with the day, so recompute hourly rather than every second.
  const hour = Math.floor(now / HOUR);
  const streak = useMemo(() => currentStreak(fasts, hour * HOUR), [fasts, hour]);
  // The streak tile's seven circles: the last 7 days, oldest first, today last.
  const week = useMemo(() => dailyBars(fasts, 7, hour * HOUR), [fasts, hour]);

  const waterPct = Math.min(waterTodayMl / settings.waterGoalMl, 1);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title">{greeting(now)}</Text>
            <Text variant="caption">
              {new Date(now).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
              {streak > 0 ? ` · Day ${streak}` : ''}
            </Text>
          </View>
          <IconButton icon="list" label="History" onPress={() => router.push('/history')} />
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
        </View>

        <Card style={{ gap: 14 }}>
          <View style={styles.rowBetween}>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/plans')} style={styles.chip}>
              <Icon name="clock" size={16} color={colors.ink} />
              <Text variant="label">{ratioFor(goalMinutes)} plan</Text>
              <Icon name="chevron-down" size={14} color={colors.ink} />
            </Pressable>
            {snap && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/zones')}
                style={[styles.chip, { backgroundColor: snap.zone.tint }]}
              >
                <View style={[styles.dot, { backgroundColor: snap.zone.color }]} />
                <Text variant="label">{snap.zone.label}</Text>
              </Pressable>
            )}
            {eating && (
              <View style={[styles.chip, { backgroundColor: colors.greenTint }]}>
                <View style={[styles.dot, { backgroundColor: EATING_COLOR }]} />
                <Text variant="label">{eating.closed ? 'Window closed' : 'Eating'}</Text>
              </View>
            )}
          </View>

          <View style={{ alignItems: 'center' }}>
            <ZoneRing
              elapsedH={snap?.elapsedH ?? 0}
              goalH={goalMinutes / 60}
              eatingProgress={eating?.progress}
              label={snap ? 'Fasting progress' : eating ? 'Eating window progress' : 'Fasting progress'}
            >
              {eating && !eating.closed ? (
                <>
                  <Text variant="caption">Eating window</Text>
                  <Text
                    variant="number"
                    style={{ fontSize: 38, lineHeight: 44 }}
                    accessibilityLabel={`${formatHM(eating.remainingMs)} left in your eating window`}
                  >
                    {formatClock(eating.remainingMs)}
                  </Text>
                  <Text variant="label" style={{ color: colors.greenInk }}>
                    left to eat
                  </Text>
                </>
              ) : eating?.closed ? (
                <>
                  <Mascot size={52} />
                  <Text variant="caption">Eating window closed</Text>
                  <Text variant="number">{formatHM(goalMinutes * MINUTE)} goal</Text>
                </>
              ) : active && snap ? (
                <>
                  <Text variant="caption">Fasting for</Text>
                  <Text variant="number" style={{ fontSize: 38, lineHeight: 44 }} accessibilityLabel={`Fasting for ${formatHM(snap.elapsedMs)}`}>
                    {formatClock(snap.elapsedMs)}
                  </Text>
                  <Text variant="label" style={{ color: colors.orangeInk }}>
                    {snap.goalReached ? `Goal reached +${formatHM(-snap.remainingMs)}` : `${formatHM(snap.remainingMs)} to go`}
                  </Text>
                </>
              ) : (
                <>
                  <Mascot size={52} />
                  <Text variant="caption">Ready when you are</Text>
                  <Text variant="number">{formatHM(goalMinutes * MINUTE)} goal</Text>
                </>
              )}
            </ZoneRing>
          </View>

          {active && snap && (
            <View style={styles.times}>
              <Pressable accessibilityRole="button" accessibilityHint="Edit the start time" onPress={() => setEditing('start')} style={styles.timeBox}>
                <Text variant="caption" style={styles.timeLabel}>
                  Started
                </Text>
                <View style={styles.rowGap}>
                  <Text variant="label" style={{ fontSize: 16 }}>
                    {formatRelativeDayTime(active.startedAt, now)}
                  </Text>
                  <Icon name="pencil" size={14} color={colors.inkMuted} />
                </View>
              </Pressable>
              <View style={styles.timeBox}>
                <Text variant="caption" style={styles.timeLabel}>
                  Goal
                </Text>
                <Text variant="label" style={{ fontSize: 16 }}>
                  {formatRelativeDayTime(snap.goalAt, now)}
                </Text>
              </View>
            </View>
          )}

          {eating && (
            <View style={styles.times}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Edit when your last fast ended"
                onPress={() => setEditing('end')}
                style={styles.timeBox}
              >
                <Text variant="caption" style={styles.timeLabel}>
                  Fast ended
                </Text>
                <View style={styles.rowGap}>
                  <Text variant="label" style={{ fontSize: 16 }}>
                    {formatRelativeDayTime(eating.startedAt, now)}
                  </Text>
                  <Icon name="pencil" size={14} color={colors.inkMuted} />
                </View>
              </Pressable>
              <View style={styles.timeBox}>
                <Text variant="caption" style={styles.timeLabel}>
                  {eating.closed ? 'Window closed' : 'Next fast'}
                </Text>
                <Text variant="label" style={{ fontSize: 16 }}>
                  {formatRelativeDayTime(eating.endsAt, now)}
                </Text>
              </View>
            </View>
          )}

          {active ? (
            <PillButton
              label="End fast"
              icon="arrow-right"
              onPress={() => {
                void endFast().then(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
              }}
            />
          ) : (
            <PillButton
              label={eating ? 'Start next fast' : 'Start fast'}
              icon="play"
              iconPosition="leading"
              tone="accent"
              onPress={() => void startFast()}
            />
          )}
        </Card>

        {celebrating && (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Dismisses this message"
            onPress={dismissCelebration}
            style={styles.celebration}
          >
            <Mascot size={56} mood="happy" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">Fast complete!</Text>
              <Text variant="number">{formatHM(snapshot(celebrating, now).elapsedMs)}</Text>
              <Text variant="caption" style={{ color: colors.ink }}>
                {metGoal(celebrating) ? 'Goal reached' : `${formatHM(celebrating.goalMinutes * MINUTE)} goal`}
                {freshBadges.length > 0
                  ? ` · New badge: ${freshBadges.map((k) => BADGES.find((b) => b.key === k)?.title).join(', ')}`
                  : ''}
              </Text>
            </View>
            <Icon name="trophy" color={colors.ink} />
          </Pressable>
        )}

        <View style={styles.tiles}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Water ${(waterTodayMl / 1000).toFixed(2)} litres. Tap to add 250 millilitres, long press to undo.`}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              addWater();
            }}
            onLongPress={undoWater}
            style={[styles.tile, styles.waterTile, { backgroundColor: colors.lavenderTint }]}
          >
            <View style={styles.rowBetween}>
              <View style={styles.rowGap}>
                <Icon name="drop" size={16} color={colors.ink} />
                <Text variant="label">Water</Text>
              </View>
              <View style={styles.plus}>
                <Icon name="plus" size={18} color={colors.inkOnDark} strokeWidth={2.6} />
              </View>
            </View>
            <Text variant="number">
              {(waterTodayMl / 1000).toFixed(2).replace(/0$/, '')}
              <Text variant="label" style={{ color: colors.lavenderInk }}>
                {' '}/ {settings.waterGoalMl / 1000} L
              </Text>
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${waterPct * 100}%` }]} />
            </View>
          </Pressable>

          <View
            accessible
            accessibilityLabel={`Streak ${streak} ${streak === 1 ? 'day' : 'days'}. Goal met on ${week.filter((d) => d.metGoal).length} of the last 7 days.`}
            style={[styles.tile, styles.streakTile, { backgroundColor: colors.greenTint }]}
          >
            <View style={styles.rowGap}>
              <Icon name="flame" size={16} color={colors.ink} />
              <Text variant="label">Streak</Text>
            </View>
            <Text variant="number">
              {`${streak} `}
              <Text variant="label" style={{ color: colors.greenInk }}>
                {streak === 1 ? 'day' : 'days'}
              </Text>
            </Text>
            <View style={styles.weekDots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {week.map((d, i) => {
                const today = i === week.length - 1;
                return (
                  <View
                    key={d.key}
                    style={[
                      styles.weekDot,
                      d.metGoal ? styles.weekDotMet : today ? styles.weekDotToday : styles.weekDotMissed,
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {active && (
        <TimeEditSheet
          visible={editing === 'start'}
          title="When did you start?"
          value={active.startedAt}
          onClose={() => setEditing(null)}
          onSave={(ts) => {
            const err = editActiveStart(ts);
            return err ? VALIDATION_MESSAGES[err] : null;
          }}
        />
      )}
      {eating && (
        <TimeEditSheet
          visible={editing === 'end'}
          title="When did you end your fast?"
          value={eating.fast.endedAt}
          onClose={() => setEditing(null)}
          onSave={(ts) => {
            const err = editFast(eating.fast.id, eating.fast.startedAt, ts);
            return err ? VALIDATION_MESSAGES[err] : null;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 16, height: 16, borderRadius: 8 },
  times: { flexDirection: 'row', gap: 10 },
  timeBox: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, gap: 2 },
  timeLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  tiles: { flexDirection: 'row', gap: 12 },
  // Matches the design's 104pt tiles; minHeight (not height) so larger text can grow them.
  tile: { flex: 1, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16, gap: 8, minHeight: 104 },
  streakTile: { gap: 6 },
  weekDots: { flexDirection: 'row', gap: 5 },
  weekDot: { width: 14, height: 14, borderRadius: 7 },
  weekDotMet: { backgroundColor: colors.ink },
  weekDotToday: { backgroundColor: colors.bg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ink },
  weekDotMissed: { backgroundColor: 'rgba(255,255,255,0.55)' },
  waterTile: { paddingRight: 14 },
  // 44pt like the design; the negative margins keep the tile at its 104pt height.
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginVertical: -6,
    marginRight: -4,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#5B48C2' },
  celebration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.yellow,
    borderRadius: radius.lg,
    padding: 16,
  },
});
