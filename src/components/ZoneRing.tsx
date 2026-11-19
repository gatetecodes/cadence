import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { ringSegments } from '../engine/zones';
import { colors, EATING_COLOR } from '../theme/tokens';

type Props = {
  elapsedH: number;
  goalH: number;
  size?: number;
  stroke?: number;
  /** Between fasts: eating-window progress (0..1), drawn as one arc instead of zones. */
  eatingProgress?: number;
  /** Spoken by screen readers, e.g. "Fasting progress". */
  label?: string;
  children?: ReactNode;
};

/**
 * The home ring: one rounded band per zone the fast has passed through,
 * separated by a hairline, with a flame marker at "now". Between fasts it
 * shows the eating window as a single arc with a plain marker.
 */
export const ZoneRing = memo(function ZoneRing({ elapsedH, goalH, size = 260, stroke = 30, eatingProgress, label, children }: Props) {
  const r = (size - stroke) / 2 - 8;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  // Rounded caps add stroke/2 at each end; inset by that plus 1px for the hairline gap.
  const inset = stroke / 2 + 1;
  const eating = eatingProgress !== undefined;
  const segments = eating ? [] : ringSegments(elapsedH, goalH);
  const progress = eating ? eatingProgress : Math.min(elapsedH / goalH, 1);
  const theta = progress * 2 * Math.PI;
  const knob = { x: c + r * Math.sin(theta), y: c - r * Math.cos(theta) };

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ now: Math.round(progress * 100), min: 0, max: 100 }}
    >
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} fill="none" stroke={colors.ringTrack} strokeWidth={stroke} />
        <G rotation={-90} origin={`${c}, ${c}`}>
          {segments.map((s) => {
            const start = s.from * circumference + inset;
            const len = Math.max(s.to * circumference - inset - start, 0.01);
            return (
              <Circle
                key={s.zone.id}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={s.zone.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${len} ${circumference}`}
                strokeDashoffset={-start}
              />
            );
          })}
          {eating && progress > 0 && (
            <Circle
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={EATING_COLOR}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(progress * circumference - 2 * inset, 0.01)} ${circumference}`}
              strokeDashoffset={-inset}
            />
          )}
        </G>
        {eating && progress > 0 && (
          <G x={knob.x} y={knob.y}>
            <Circle r={21} fill={colors.surface} />
            <Circle r={8} fill={EATING_COLOR} />
          </G>
        )}
        {!eating && elapsedH > 0 && (
          <G x={knob.x} y={knob.y}>
            <Circle r={21} fill={colors.surface} />
            <Path
              d="M0 9c3.5 0 6-2.3 6-6 0-3.4-2.6-5.6-3.4-8.6C.9-4.3 0-2.6 0-.5c-.9-.9-1.7-1.7-1.7-3.4C-3.4-2.2-6 .4-6 3c0 3.7 2.5 6 6 6z"
              fill={colors.orange}
            />
          </G>
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
