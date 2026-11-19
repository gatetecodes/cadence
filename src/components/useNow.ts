import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Current time, refreshed every `intervalMs` while the screen is focused and
 * the app is in the foreground. Nothing ticks in the background.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!focused || !active) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      // Align each tick to the wall-clock boundary so the clock never looks jumpy or drifts.
      timer = setTimeout(tick, intervalMs - (t % intervalMs));
    };
    // First tick right away, so the time is fresh on focus or return to the foreground.
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [focused, active, intervalMs]);

  return now;
}
