import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, fonts } from '../theme/tokens';

export const WHEEL_ITEM_HEIGHT = 44;
export const WHEEL_VISIBLE_ROWS = 5;
const PAD = WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ROWS / 2);

type Props = {
  items: readonly string[];
  index: number;
  onChange: (index: number) => void;
  width: number;
  /** Spoken name of the column, e.g. "Hour". */
  label: string;
};

const tick = () => void Haptics.selectionAsync();

/**
 * One scrolling column of a wheel picker. Snaps to rows, ticks a haptic per
 * row, and commits when the scroll settles. Tapping a row selects it.
 * External `index` changes (nudges, day switches) scroll the wheel to match.
 */
export const WheelPicker = memo(function WheelPicker({ items, index, onChange, width, label }: Props) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(index * WHEEL_ITEM_HEIGHT);
  const lastRow = useSharedValue(index);
  const dragging = useSharedValue(false);
  // The row this wheel last reported or was scrolled to, so parent echoes of
  // our own commits don't trigger a scroll.
  const shown = useRef(index);
  const max = items.length - 1;

  const commit = (row: number) => {
    shown.current = row;
    onChange(row);
  };

  const handler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      const row = Math.min(max, Math.max(0, Math.round(e.contentOffset.y / WHEEL_ITEM_HEIGHT)));
      if (row !== lastRow.value) {
        lastRow.value = row;
        if (dragging.value) scheduleOnRN(tick);
      }
    },
    onBeginDrag: () => {
      dragging.value = true;
    },
    onEndDrag: (e) => {
      const row = Math.min(max, Math.max(0, Math.round(e.contentOffset.y / WHEEL_ITEM_HEIGHT)));
      scheduleOnRN(commit, row);
    },
    onMomentumEnd: (e) => {
      dragging.value = false;
      const row = Math.min(max, Math.max(0, Math.round(e.contentOffset.y / WHEEL_ITEM_HEIGHT)));
      scheduleOnRN(commit, row);
    },
  });

  useEffect(() => {
    if (index === shown.current) return;
    shown.current = index;
    ref.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
  }, [index, ref]);

  return (
    <View
      style={{ width, height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = e.nativeEvent.actionName === 'increment' ? index + 1 : index - 1;
        if (next >= 0 && next <= max) {
          shown.current = next;
          ref.current?.scrollTo({ y: next * WHEEL_ITEM_HEIGHT, animated: false });
          onChange(next);
        }
      }}
    >
      <Animated.ScrollView
        ref={ref}
        onScroll={handler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: index * WHEEL_ITEM_HEIGHT }}
        onLayout={() => ref.current?.scrollTo({ y: shown.current * WHEEL_ITEM_HEIGHT, animated: false })}
        contentContainerStyle={{ paddingVertical: PAD }}
        nestedScrollEnabled
      >
        {items.map((item, i) => (
          <Pressable
            key={item}
            importantForAccessibility="no"
            onPress={() => {
              if (i === shown.current) return;
              tick();
              shown.current = i;
              ref.current?.scrollTo({ y: i * WHEEL_ITEM_HEIGHT, animated: true });
              onChange(i);
            }}
          >
            <WheelRow text={item} row={i} scrollY={scrollY} />
          </Pressable>
        ))}
      </Animated.ScrollView>
    </View>
  );
});

function WheelRow({ text, row, scrollY }: { text: string; row: number; scrollY: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = scrollY.value / WHEEL_ITEM_HEIGHT - row;
    return {
      opacity: interpolate(d, [-2.5, -1, 0, 1, 2.5], [0.15, 0.45, 1, 0.45, 0.15], 'clamp'),
      transform: [
        { perspective: 600 },
        { rotateX: `${interpolate(d, [-3, 0, 3], [60, 0, -60], 'clamp')}deg` },
        { scale: interpolate(d, [-2, 0, 2], [0.86, 1, 0.86], 'clamp') },
      ],
    };
  });
  return (
    <Animated.View style={[styles.row, style]}>
      <Animated.Text style={styles.text}>{text}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  text: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.6,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});
