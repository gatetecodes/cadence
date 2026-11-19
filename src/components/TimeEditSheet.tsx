import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDays,
  atTimeOfDay,
  DAY,
  formatAgo,
  formatRelativeDayTime,
  HOUR,
  MINUTE,
  onDay,
  startOfDay,
  uses24HourClock,
} from '../engine/time';
import { colors, fonts, radius } from '../theme/tokens';
import { Text } from './Text';
import { PillButton } from './ui';
import { useNow } from './useNow';
import { WHEEL_ITEM_HEIGHT, WHEEL_VISIBLE_ROWS, WheelPicker } from './WheelPicker';

type Props = {
  visible: boolean;
  title: string;
  value: number;
  /** Returns an error message to keep the sheet open, or null to close. */
  onSave: (value: number) => string | null;
  onClose: () => void;
};

const NUDGES = [
  { label: '−1h', delta: -HOUR },
  { label: '−15m', delta: -15 * MINUTE },
  { label: '+15m', delta: 15 * MINUTE },
  { label: '+1h', delta: HOUR },
];

/** How far back the day strip reaches (it also always includes the current value's day). */
const DAYS_BACK = 13;

const IS_24H = uses24HourClock();
const HOURS = IS_24H
  ? Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  : Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'] as const;

function dayLabel(day: number, today: number): string {
  const diff = Math.round((day - today) / DAY);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  const d = new Date(day);
  return `${d.toLocaleDateString([], { weekday: 'short' })} ${d.getDate()}`;
}

/** Bottom sheet for fixing a start or end time: pick a day, spin to the time, or nudge. */
export function TimeEditSheet({ visible, title, value, onSave, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const now = useNow(30_000);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(visible);

  // Re-seed from `value` each time the sheet opens (adjusting state while rendering, not in an effect).
  if (visible !== isOpen) {
    setIsOpen(visible);
    if (visible) {
      setDraft(value);
      setError(null);
    }
  }

  const update = useCallback((next: (prev: number) => number) => {
    setError(null);
    setDraft(next);
  }, []);

  const date = new Date(draft);
  const hour24 = date.getHours();
  const hourIndex = IS_24H ? hour24 : (hour24 % 12 || 12) - 1;
  const today = startOfDay(now);
  const selectedDay = startOfDay(draft);
  const isFuture = draft > now;

  // Newest first, so "Today" and "Yesterday" are visible without scrolling.
  const days = useMemo(() => {
    const last = Math.min(addDays(today, -DAYS_BACK), selectedDay);
    const list: number[] = [];
    for (let d = today; d >= last; d = addDays(d, -1)) list.push(d);
    return list;
  }, [today, selectedDay]);

  const onHour = useCallback(
    (i: number) =>
      update((prev) => {
        const p = new Date(prev);
        const h = IS_24H ? i : ((i + 1) % 12) + (p.getHours() >= 12 ? 12 : 0);
        return atTimeOfDay(prev, h, p.getMinutes());
      }),
    [update],
  );
  const onMinute = useCallback((i: number) => update((prev) => atTimeOfDay(prev, new Date(prev).getHours(), i)), [update]);
  const onMeridiem = useCallback(
    (i: number) =>
      update((prev) => {
        const p = new Date(prev);
        return atTimeOfDay(prev, (p.getHours() % 12) + i * 12, p.getMinutes());
      }),
    [update],
  );

  // When the sheet opens on an older day, scroll the strip so that day is in view.
  const dayStrip = useRef<ScrollViewInstance>(null);
  const chipX = useRef(new Map<number, number>());
  const scrolledDays = useRef(false);
  const revealSelectedDay = () => {
    if (scrolledDays.current) return;
    const x = chipX.current.get(selectedDay);
    if (x === undefined) return;
    scrolledDays.current = true;
    if (x > 200) dayStrip.current?.scrollTo({ x: x - 80, animated: false });
  };

  const close = () => {
    scrolledDays.current = false;
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text variant="title">{title}</Text>
          <Text variant="number" style={styles.summary} accessibilityLiveRegion="polite">
            {formatRelativeDayTime(draft, now)}
          </Text>
          <Text variant="caption" style={isFuture && { color: colors.orangeInk }}>
            {isFuture ? "That's in the future. Pick an earlier time." : formatAgo(draft, now)}
          </Text>
        </View>

        <ScrollView
          ref={dayStrip}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.days}
          style={styles.dayStrip}
          onContentSizeChange={revealSelectedDay}
        >
          {days.map((d) => {
            const selected = d === selectedDay;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onLayout={(e) => chipX.current.set(d, e.nativeEvent.layout.x)}
                onPress={() => {
                  void Haptics.selectionAsync();
                  update((prev) => onDay(prev, d));
                }}
                style={[styles.day, selected && styles.daySelected]}
              >
                <Text variant="label" style={selected && { color: colors.inkOnDark }}>
                  {dayLabel(d, today)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.wheels}>
          <View style={styles.band} pointerEvents="none" />
          <WheelPicker label="Hour" items={HOURS} index={hourIndex} onChange={onHour} width={76} />
          <Text style={styles.colon}>:</Text>
          <WheelPicker label="Minute" items={MINUTES} index={date.getMinutes()} onChange={onMinute} width={76} />
          {!IS_24H && (
            <WheelPicker label="AM or PM" items={MERIDIEM} index={hour24 >= 12 ? 1 : 0} onChange={onMeridiem} width={76} />
          )}
        </View>

        <View style={styles.nudges}>
          {NUDGES.map((n) => (
            <Pressable
              key={n.label}
              accessibilityRole="button"
              accessibilityLabel={n.label.replace('−', 'minus ').replace('+', 'plus ')}
              onPress={() => {
                void Haptics.selectionAsync();
                update((d) => d + n.delta);
              }}
              style={({ pressed }) => [styles.nudge, pressed && { backgroundColor: colors.surfaceMuted }]}
            >
              <Text variant="label">{n.label}</Text>
            </Pressable>
          ))}
        </View>

        {error && (
          <Text variant="caption" style={{ color: colors.orangeInk, textAlign: 'center' }}>
            {error}
          </Text>
        )}

        <PillButton
          label="Save"
          icon="check"
          disabled={isFuture}
          onPress={() => {
            const err = onSave(draft);
            if (err) setError(err);
            else close();
          }}
        />
      </View>
    </Modal>
  );
}

const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(90,62,48,0.35)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    gap: 16,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  header: { gap: 4 },
  summary: { fontSize: 30, lineHeight: 36, marginTop: 4 },
  dayStrip: { marginHorizontal: -24, flexGrow: 0 },
  days: { gap: 8, paddingHorizontal: 24 },
  day: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  wheels: {
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2 - 2,
    height: WHEEL_ITEM_HEIGHT + 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  colon: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginBottom: 4 },
  nudges: { flexDirection: 'row', gap: 8 },
  nudge: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const VALIDATION_MESSAGES = {
  'start-in-future': 'That time is in the future.',
  'end-before-start': 'The end has to come after the start.',
  'too-long': 'Fasts longer than 72 hours look like a typo. Check the date.',
} as const;
