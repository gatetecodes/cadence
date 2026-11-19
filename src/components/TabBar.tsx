import type { BottomTabBarProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadow } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const ICONS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: 'Home' },
  zones: { icon: 'flame', label: 'Zones' },
  progress: { icon: 'chart', label: 'Progress' },
  plans: { icon: 'calendar', label: 'Plans' },
};

/** The floating brown pill from the design; the active tab expands to show its label. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={meta.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                if (!focused) {
                  void Haptics.selectionAsync();
                  navigateToTab(route.key);
                }
              }}
              style={[styles.item, focused && styles.itemActive]}
            >
              <Icon name={meta.icon} color={focused ? colors.ink : '#D9CCBF'} />
              {focused && (
                <Text variant="label" style={{ fontSize: 15 }}>
                  {meta.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20 },
  bar: {
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    ...shadow.float,
  },
  item: { height: 48, minWidth: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  itemActive: { backgroundColor: colors.orange, paddingLeft: 14, paddingRight: 18 },
});
