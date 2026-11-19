import { Tabs } from 'expo-router';

import { TabBar } from '../../components/TabBar';
import { colors } from '../../theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="zones" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="plans" />
    </Tabs>
  );
}
