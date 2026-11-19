import { HStack, Image, Link, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment, type LiveActivityLayout } from 'expo-widgets';

/**
 * Props are JSON-serialised by expo-widgets, so dates travel as epoch ms.
 * Everything below runs inside the widget extension: the function is turned
 * into a string by the `'widget'` directive, so it must not reference
 * module-level constants — keep values inline.
 */
export type FastActivityProps = {
  /** Missing on activities started before the eating window existed: treat as 'fast'. */
  mode?: 'fast' | 'eating';
  /** Start of the fast, or of the eating window. */
  startedAt: number;
  /** Goal time while fasting; when the eating window closes while eating. */
  goalAt: number;
  title: string;
  /** Current zone while fasting; unused while eating. */
  zone: string;
  zoneColor: string;
};

const FastActivityLayout = (props: FastActivityProps, env: LiveActivityEnvironment): LiveActivityLayout => {
  'widget';
  const ink = env.colorScheme === 'dark' ? '#F6F1EA' : '#5A3E30';
  const muted = env.colorScheme === 'dark' ? '#D9CCBF' : '#6E5A4E';
  const eating = props.mode === 'eating';
  // While eating, the activity goes stale when the window closes (staleDate), with no app running.
  const closed = eating && env.isStale === true;
  const accent = eating ? '#9BB068' : '#F07C25';
  const symbol = eating ? 'fork.knife' : 'flame.fill';
  const status = eating ? (closed ? 'Closed' : 'Eating') : props.zone;
  const statusColor = eating ? accent : props.zoneColor;
  const action = eating
    ? { destination: 'cadence://start-fast', label: 'Start fast' }
    : { destination: 'cadence://end-fast', label: 'End fast' };
  // Fasting counts up from the start; the upper bound only needs to be far enough away.
  // Eating counts down to the end of the window.
  const clock = eating
    ? { lower: new Date(props.startedAt), upper: new Date(props.goalAt) }
    : { lower: new Date(props.startedAt), upper: new Date(props.startedAt + 72 * 3600 * 1000) };
  const toEnd = { lower: new Date(props.startedAt), upper: new Date(props.goalAt) };
  const endLabel = eating ? (closed ? 'Window closed at' : 'Next fast at') : 'Goal at';

  const bigClock = (size: number, color: string) =>
    closed ? (
      <Text modifiers={[font({ size: size * 0.7, weight: 'heavy', design: 'rounded' }), foregroundStyle(color)]}>Time to fast</Text>
    ) : (
      <Text
        timerInterval={clock}
        countsDown={eating}
        modifiers={[font({ size, weight: 'heavy', design: 'rounded' }), monospacedDigit(), foregroundStyle(color)]}
      />
    );

  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={8}>
          <Image systemName={symbol} color={accent} size={16} />
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(muted)]}>{props.title}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(statusColor)]}>{status}</Text>
        </HStack>
        <HStack alignment="lastTextBaseline">
          {bigClock(40, ink)}
          <Spacer />
          <Link destination={action.destination} label={action.label} modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(accent)]} />
        </HStack>
        <ProgressView timerInterval={toEnd} countsDown={false} modifiers={[tint(accent)]} />
        <HStack>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{endLabel}</Text>
          <Text date={new Date(props.goalAt)} dateStyle="time" modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(ink)]} />
        </HStack>
      </VStack>
    ),
    compactLeading: <Image systemName={symbol} color={accent} />,
    compactTrailing: closed ? (
      <Image systemName="checkmark" color={accent} />
    ) : (
      <Text timerInterval={clock} countsDown={eating} modifiers={[monospacedDigit(), foregroundStyle(accent)]} />
    ),
    minimal: <Image systemName={symbol} color={accent} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 6 })]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#D9CCBF')]}>{props.title}</Text>
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(statusColor)]}>{status}</Text>
      </VStack>
    ),
    expandedTrailing: bigClock(28, '#FFFFFF'),
    expandedBottom: (
      <VStack spacing={8} modifiers={[padding({ horizontal: 6 })]}>
        <ProgressView timerInterval={toEnd} countsDown={false} modifiers={[tint(accent)]} />
        <HStack>
          <Text date={new Date(props.goalAt)} dateStyle="time" modifiers={[font({ size: 13 }), foregroundStyle('#D9CCBF')]} />
          <Spacer />
          <Link destination={action.destination} label={action.label} modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(accent)]} />
        </HStack>
      </VStack>
    ),
  };
};

export const FastLiveActivity = createLiveActivity<FastActivityProps>('FastActivity', FastActivityLayout);
