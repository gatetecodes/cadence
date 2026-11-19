import { eatingWindowEndsAt, type Fast } from './fast';
import { ratioFor } from './plans';
import { formatTime, HOUR, MINUTE } from './time';
import { ZONES } from './zones';

export type PlannedNotification = {
  /** Stable id, so rescheduling replaces rather than duplicates. */
  id: string;
  at: number;
  title: string;
  body: string;
  kind: 'zone' | 'almost' | 'goal' | 'window';
  timeSensitive?: boolean;
};

export type NotificationPrefs = {
  zoneAlerts: boolean;
  almostThere: boolean;
  goalReached: boolean;
  windowClosing: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  zoneAlerts: true,
  almostThere: true,
  goalReached: true,
  windowClosing: true,
};

/**
 * Every one-off notification that should be pending right now, given the
 * active fast (if any) and the most recently finished one. Past times are
 * dropped. Pure and deterministic: the scheduler cancels and re-adds these.
 */
export function planNotifications(
  active: Fast | null,
  lastFinished: Fast | null,
  prefs: NotificationPrefs,
  now: number,
): PlannedNotification[] {
  const out: PlannedNotification[] = [];

  if (active) {
    const goalAt = active.startedAt + active.goalMinutes * MINUTE;
    if (prefs.zoneAlerts) {
      for (const z of ZONES) {
        if (z.startH === 0) continue;
        const at = active.startedAt + z.startH * HOUR;
        // A zone that begins right at the goal is announced by the goal alert instead.
        if (prefs.goalReached && Math.abs(at - goalAt) < MINUTE) continue;
        out.push({
          id: `zone-${z.id}`,
          at,
          title: `You're in ${z.label}`,
          body: z.tip,
          kind: 'zone',
        });
      }
    }
    if (prefs.almostThere) {
      out.push({
        id: 'almost',
        at: goalAt - 30 * MINUTE,
        title: '30 minutes to go',
        body: `Your goal lands at ${formatTime(goalAt)}. You've got this.`,
        kind: 'almost',
      });
    }
    if (prefs.goalReached) {
      out.push({
        id: 'goal',
        at: goalAt,
        title: 'Goal reached',
        body: 'Nicely done. End your fast whenever you are ready.',
        kind: 'goal',
        timeSensitive: true,
      });
    }
  } else if (lastFinished?.endedAt && prefs.windowClosing) {
    const windowEnds = eatingWindowEndsAt({ ...lastFinished, endedAt: lastFinished.endedAt });
    out.push({
      id: 'window',
      at: windowEnds - 30 * MINUTE,
      title: 'Eating window closes soon',
      body: `Your ${ratioFor(lastFinished.goalMinutes)} window ends at ${formatTime(windowEnds)}.`,
      kind: 'window',
    });
  }

  return out.filter((n) => n.at > now + 5_000).sort((a, b) => a.at - b.at);
}
