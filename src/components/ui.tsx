import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'dark' | 'accent';
  icon?: IconName;
  iconPosition?: 'leading' | 'trailing';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function PillButton({ label, onPress, tone = 'dark', icon, iconPosition = 'trailing', style, disabled }: ButtonProps) {
  const fg = tone === 'dark' ? colors.inkOnDark : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: tone === 'dark' ? colors.ink : colors.orange,
          opacity: disabled ? 0.35 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon && iconPosition === 'leading' && <Icon name={icon} color={fg} size={18} />}
      <Text variant="button" style={{ color: fg }}>
        {label}
      </Text>
      {icon && iconPosition === 'trailing' && <Icon name={icon} color={fg} size={20} />}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  style,
  color = colors.ink,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={[styles.iconButton, style]}>
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

export function StatTile({
  label,
  value,
  icon,
  bg,
  children,
}: {
  label: string;
  value: string;
  icon: IconName;
  bg: string;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <View style={styles.row}>
        <Icon name={icon} size={15} color={colors.ink} />
        <Text variant="label">{label}</Text>
      </View>
      <Text variant="number">{value}</Text>
      {children}
    </View>
  );
}

/** − / + buttons with 44pt targets. Each side disables itself at its bound. */
export function Stepper({
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  canDecrement = true,
  canIncrement = true,
  bg = colors.surfaceMuted,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  canDecrement?: boolean;
  canIncrement?: boolean;
  bg?: string;
}) {
  const step = (label: string, glyph: string, enabled: boolean, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.step, { backgroundColor: bg, opacity: enabled ? 1 : 0.35 }]}
    >
      <Text variant="label" style={{ fontSize: 18 }}>
        {glyph}
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {step(decrementLabel, '−', canDecrement, onDecrement)}
      {step(incrementLabel, '+', canIncrement, onIncrement)}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(o.id);
            }}
            style={[styles.segment, on && { backgroundColor: colors.ink }]}
          >
            <Text variant="label" style={{ color: on ? colors.inkOnDark : colors.ink }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, ...shadow.card },
  pill: {
    height: 56,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: { flex: 1, borderRadius: radius.lg, padding: 14, gap: 6, minHeight: 96 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', gap: 4, backgroundColor: colors.surface, borderRadius: 22, padding: 4 },
  segment: { height: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
