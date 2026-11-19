import { Platform } from 'react-native';

import { CadenceLiveNotification } from '../../modules/cadence-live-notification';
import type { EatingSnapshot, Fast } from '../engine/fast';
import { ratioFor } from '../engine/plans';
import { HOUR, MINUTE } from '../engine/time';
import { zoneAt, ZONES } from '../engine/zones';
import { colors, EATING_COLOR } from '../theme/tokens';
import type { FastActivityProps } from './FastActivity';

/**
 * One interface over the platform "live" surfaces:
 * - Android: a persistent chronometer notification (local Kotlin module).
 * - iOS: a Live Activity with Dynamic Island (expo-widgets).
 * Both draw the ticking timer themselves, counting up through a fast or down
 * through the eating window that follows it.
 */
export type LiveSurfaceOptions = { repostOnDismiss: boolean };

/** iOS ends Live Activities after 8h; restart a little before that whenever the app is open. */
const IOS_RESTART_AFTER = 7.5 * HOUR;

export async function showLiveFast(fast: Fast, opts: LiveSurfaceOptions): Promise<void> {
  const title = `${ratioFor(fast.goalMinutes)} fast`;

  if (Platform.OS === 'android') {
    CadenceLiveNotification.start({
      mode: 'fast',
      startedAt: fast.startedAt,
      goalMinutes: fast.goalMinutes,
      title,
      accentColor: colors.orange,
      scheme: 'cadence',
      zones: ZONES.map((z) => ({ startMinutes: z.startH * 60, label: z.label, color: z.color })),
      repostOnDismiss: opts.repostOnDismiss,
    });
    return;
  }

  if (Platform.OS === 'ios') {
    const zone = zoneAt((Date.now() - fast.startedAt) / HOUR);
    await showActivity(`fast-${fast.id}`, {
      mode: 'fast',
      startedAt: fast.startedAt,
      goalAt: fast.startedAt + fast.goalMinutes * MINUTE,
      title,
      zone: zone.label,
      zoneColor: zone.color,
    });
  }
}

/** The countdown to the next fast. Callers only pass a window that is still open. */
export async function showLiveEating(eating: EatingSnapshot, opts: LiveSurfaceOptions): Promise<void> {
  const title = 'Eating window';

  if (Platform.OS === 'android') {
    CadenceLiveNotification.start({
      mode: 'eating',
      startedAt: eating.startedAt,
      endsAt: eating.endsAt,
      title,
      accentColor: EATING_COLOR,
      scheme: 'cadence',
      repostOnDismiss: opts.repostOnDismiss,
    });
    return;
  }

  if (Platform.OS === 'ios') {
    // The activity can't remove itself at a set time, so it goes stale when the window closes
    // and shows "Time to fast" until the app next opens and ends it.
    await showActivity(
      `eating-${eating.fast.id}`,
      {
        mode: 'eating',
        startedAt: eating.startedAt,
        goalAt: eating.endsAt,
        title,
        zone: '',
        zoneColor: EATING_COLOR,
      },
      new Date(eating.endsAt),
    );
  }
}

export async function hideLive(): Promise<void> {
  if (Platform.OS === 'android') {
    CadenceLiveNotification.stop();
    return;
  }
  if (Platform.OS === 'ios') {
    const { FastLiveActivity } = await import('./FastActivity');
    await Promise.all(FastLiveActivity.getInstances().map((a) => a.end('default')));
    activityStarts.clear();
  }
}

/**
 * Updates the running activity for `key`, or replaces whatever is running with
 * a fresh one: when the key changes (fast → eating window, or a new fast), and
 * when the current one is close to iOS's 8-hour limit.
 */
async function showActivity(key: string, props: FastActivityProps, staleDate?: Date): Promise<void> {
  const { FastLiveActivity } = await import('./FastActivity');
  const existing = FastLiveActivity.getInstances();
  const startedAt = activityStarts.get(key) ?? 0;
  const tooOld = Date.now() - startedAt > IOS_RESTART_AFTER;

  if (existing.length > 0 && !tooOld) {
    await Promise.all(existing.map((a) => a.update(props, staleDate)));
    return;
  }
  await Promise.all(existing.map((a) => a.end('immediate')));
  activityStarts.clear();
  try {
    FastLiveActivity.start(props, 'cadence:///', staleDate);
    activityStarts.set(key, Date.now());
  } catch (e) {
    // Live Activities can be disabled per app in Settings; the scheduled alerts still cover it.
    console.warn('[cadence] Live Activity not started', e);
  }
}

/**
 * In-memory record of when this process started the current activity, by key.
 * After a cold start it is empty, so an existing activity is restarted once:
 * that also resets iOS's 8-hour clock, which is what we want.
 */
const activityStarts = new Map<string, number>();
