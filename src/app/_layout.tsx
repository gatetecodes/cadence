import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { configureNotifications } from '../notifications/scheduler';
import { useFastStore } from '../store/useFastStore';
import { colors } from '../theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const ready = useFastStore((s) => s.ready);

  // Database is opened synchronously on import, so the store can load straight away.
  useEffect(() => {
    void configureNotifications().then(() => useFastStore.getState().init());
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) void SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);

  // Coming back to the foreground: re-sync alerts and restart the iOS Live Activity if it aged out.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useFastStore.getState().ready) void useFastStore.getState().resync();
    });
    return () => sub.remove();
  }, []);

  // Tapping a notification opens the screen it points to.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('cadence://')) router.navigate('/');
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || !ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="end-fast" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="start-fast" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
