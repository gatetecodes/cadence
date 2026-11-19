import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useFastStore } from '../store/useFastStore';

/**
 * Deep link target for "Start fast" in the Android eating-window notification
 * and the iOS Live Activity (cadence://start-fast). Starts a fast at the moment
 * the link was opened, then shows the timer on Home. Does nothing if a fast is
 * already running.
 */
export default function StartFastLink() {
  useEffect(() => {
    const openedAt = Date.now();
    const { active, startFast } = useFastStore.getState();
    const start = active ? Promise.resolve() : startFast(openedAt).then(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    void start.finally(() => router.replace('/'));
  }, []);
  return null;
}
