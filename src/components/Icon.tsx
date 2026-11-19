import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'flame'
  | 'chart'
  | 'calendar'
  | 'bell'
  | 'clock'
  | 'chevron-down'
  | 'chevron-left'
  | 'arrow-right'
  | 'play'
  | 'plus'
  | 'drop'
  | 'check'
  | 'trophy'
  | 'settings'
  | 'list'
  | 'pencil'
  | 'trash';

type Props = { name: IconName; size?: number; color?: string; filled?: boolean; strokeWidth?: number };

/** Inline stroke icons drawn on a 24×24 grid. */
export function Icon({ name, size = 22, color = 'currentColor', filled = false, strokeWidth = 2.2 }: Props) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'home' && <Path {...stroke} d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />}
      {name === 'flame' && (
        <Path
          {...stroke}
          fill={filled ? color : 'none'}
          d="M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-2 1.5-3 3.5-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4.3 3 7 7 7z"
        />
      )}
      {name === 'chart' && <Path {...stroke} d="M5 20v-8M12 20V5M19 20v-5" />}
      {name === 'calendar' && (
        <>
          <Rect {...stroke} x={3} y={5} width={18} height={16} rx={3} />
          <Path {...stroke} d="M3 10h18M8 3v4M16 3v4" />
        </>
      )}
      {name === 'bell' && <Path {...stroke} d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />}
      {name === 'clock' && (
        <>
          <Circle {...stroke} cx={12} cy={12} r={9} />
          <Path {...stroke} d="M12 7v5l3 2" />
        </>
      )}
      {name === 'chevron-down' && <Path {...stroke} d="M6 9l6 6 6-6" />}
      {name === 'chevron-left' && <Path {...stroke} d="M15 6l-6 6 6 6" />}
      {name === 'arrow-right' && <Path {...stroke} d="M5 12h14M13 6l6 6-6 6" />}
      {name === 'play' && <Path fill={color} d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" />}
      {name === 'plus' && <Path {...stroke} d="M12 5v14M5 12h14" />}
      {name === 'drop' && <Path {...stroke} d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />}
      {name === 'check' && <Path {...stroke} d="M5 12l5 5 9-10" />}
      {name === 'trophy' && <Path {...stroke} d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" />}
      {name === 'settings' && (
        <>
          <Circle {...stroke} cx={12} cy={12} r={3} />
          <Path
            {...stroke}
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
          />
        </>
      )}
      {name === 'list' && <Path {...stroke} d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />}
      {name === 'pencil' && <Path {...stroke} d="M4 20h4L19 9l-4-4L4 16z" />}
      {name === 'trash' && <Path {...stroke} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />}
    </Svg>
  );
}
