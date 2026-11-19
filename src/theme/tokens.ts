/**
 * Cadence design tokens — the approved "earthy" direction.
 * Display type: Bricolage Grotesque. UI type: Figtree.
 */
export const colors = {
  bg: '#F6F1EA',
  surface: '#FFFFFF',
  surfaceMuted: '#F3ECE3',
  ink: '#5A3E30',
  inkMuted: '#6E5A4E',
  inkOnDark: '#F6F1EA',
  line: '#E2D7CB',
  ringTrack: '#F1E9DF',

  orange: '#F07C25',
  orangeInk: '#B45612',
  orangeTint: '#FBDDC5',
  green: '#9BB068',
  greenTint: '#C9D8A6',
  greenInk: '#4D5E2A',
  yellow: '#F7CB57',
  yellowTint: '#FBEBC0',
  lavender: '#A99CF2',
  lavenderTint: '#CFC7F7',
  lavenderInk: '#4E3D86',
  brown: '#5A3E30',
  /** Softer brown for large panels, so the ink tab bar floating over them stays distinct. */
  mocha: '#8C6E5D',
  sage: '#E4EBD2',
  sageLine: '#D3DEB6',
  peach: '#FBEADB',
} as const;

/** The eating window shares the Anabolic green: the body is fed and digesting. */
export const EATING_COLOR = colors.green;

export const radius = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

export const space = (n: number) => n * 4;

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  ui: 'Figtree_500Medium',
  uiSemi: 'Figtree_600SemiBold',
  uiBold: 'Figtree_700Bold',
  uiHeavy: 'Figtree_800ExtraBold',
} as const;

/**
 * Soft, warm-tinted shadows (brown, never black/gray) so surfaces lift gently
 * off the cream background. Each pairs a tight contact shadow with a wide,
 * faint ambient one. `boxShadow` renders identically on iOS and Android
 * (new architecture), unlike `elevation`, which ignores color and opacity.
 */
export const shadow = {
  /** Resting cards on the page background. */
  card: { boxShadow: '0 1px 2px rgba(75, 46, 32, 0.04), 0 6px 16px rgba(75, 46, 32, 0.05)' },
  /** Selected / emphasized surfaces — a touch more lift than a card. */
  raised: { boxShadow: '0 2px 4px rgba(75, 46, 32, 0.06), 0 8px 20px rgba(75, 46, 32, 0.08)' },
  /** Floating chrome (tab bar) that sits over scrolling content. */
  float: { boxShadow: '0 2px 6px rgba(59, 35, 24, 0.08), 0 10px 24px rgba(59, 35, 24, 0.10)' },
} as const;
