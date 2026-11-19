import { router } from 'expo-router';
import { useEffect } from 'react';

import { useFastStore } from '../store/useFastStore';

/**
 * Deep link target for "End fast" in the Android notification and the iOS
 * Live Activity (cadence://end-fast). Ends the running fast at the moment the
 * link was opened, then shows the celebration on Home.
 */
export default function EndFastLink() {
  useEffect(() => {
    const openedAt = Date.now();
    void useFastStore
      .getState()
      .endFast(openedAt)
      .finally(() => router.replace('/'));
  }, []);
  return null;
}
