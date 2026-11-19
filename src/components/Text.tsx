import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from '../theme/tokens';

type Variant = 'display' | 'title' | 'number' | 'body' | 'label' | 'caption' | 'button';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  number: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  body: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.uiBold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.uiSemi, fontSize: 13, lineHeight: 17, color: colors.inkMuted },
  button: { fontFamily: fonts.uiBold, fontSize: 17, lineHeight: 22 },
};

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <RNText {...rest} style={[{ color: colors.ink }, variants[variant], style]} />;
}
