import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../theme/tokens';

/** The stopwatch character. `happy` closes its eyes for celebrations. */
export function Mascot({ size = 56, mood = 'smile' }: { size?: number; mood?: 'smile' | 'happy' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" accessibilityLabel="Cadence stopwatch">
      <Rect x={33} y={4} width={14} height={8} rx={3} fill={colors.ink} />
      <Path d="M60 16l6 6" stroke={colors.ink} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={40} cy={45} r={29} fill={colors.orange} stroke={colors.ink} strokeWidth={3.5} />
      <Circle cx={40} cy={45} r={21} fill="#FFF8F0" />
      {mood === 'happy' ? (
        <>
          <Path d="M29 43q4-5 8 0M43 43q4-5 8 0" fill="none" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
          <Path d="M32 50c4 6 12 6 16 0z" fill={colors.ink} />
        </>
      ) : (
        <>
          <Circle cx={33} cy={42} r={3} fill={colors.ink} />
          <Circle cx={47} cy={42} r={3} fill={colors.ink} />
          <Path d="M33 51c3.5 4 10.5 4 14 0" fill="none" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
      <Circle cx={26} cy={50} r={3} fill={colors.yellow} />
      <Circle cx={54} cy={50} r={3} fill={colors.yellow} />
    </Svg>
  );
}
