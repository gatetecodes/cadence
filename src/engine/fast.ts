import { eatingWindowMs } from './plans';
import { HOUR, MINUTE } from './time';
import { nextZone, zoneAt, type Zone } from './zones';

export type Fast = {
  id: number;
  planId: string;
  goalMinutes: number;
  startedAt: number;
  /** null while the fast is running. */
  endedAt: number | null;
  note: string | null;
};

export type FastSnapshot = {
  elapsedMs: number;
  elapsedH: number;
  goalMs: number;
  goalAt: number;
  remainingMs: number;
  progress: number;
  goalReached: boolean;
  zone: Zone;
  nextZone: Zone | null;
  /** Ms until the next zone begins, or null when in the last zone. */
  msToNextZone: number | null;
};

/** Everything the UI needs about a fast at time `now`. Never counts; always derives. */
export function snapshot(fast: Pick<Fast, 'startedAt' | 'endedAt' | 'goalMinutes'>, now: number): FastSnapshot {
  const end = fast.endedAt ?? now;
  const elapsedMs = Math.max(0, end - fast.startedAt);
  const elapsedH = elapsedMs / HOUR;
  const goalMs = fast.goalMinutes * MINUTE;
  const next = nextZone(elapsedH);
  return {
    elapsedMs,
    elapsedH,
    goalMs,
    goalAt: fast.startedAt + goalMs,
    remainingMs: goalMs - elapsedMs,
    progress: goalMs > 0 ? Math.min(elapsedMs / goalMs, 1) : 0,
    goalReached: elapsedMs >= goalMs,
    zone: zoneAt(elapsedH),
    nextZone: next,
    msToNextZone: next ? fast.startedAt + next.startH * HOUR - end : null,
  };
}

export function durationMs(fast: Pick<Fast, 'startedAt' | 'endedAt'>, now: number): number {
  return Math.max(0, (fast.endedAt ?? now) - fast.startedAt);
}

export function metGoal(fast: Fast): boolean {
  return fast.endedAt !== null && fast.endedAt - fast.startedAt >= fast.goalMinutes * MINUTE;
}

/** When the eating window after a finished fast closes: its end plus 24h minus its goal. */
export function eatingWindowEndsAt(fast: Fast & { endedAt: number }): number {
  return fast.endedAt + eatingWindowMs(fast.goalMinutes);
}

/** The finished fast that ended most recently. */
export function lastFinished(fasts: Fast[]): (Fast & { endedAt: number }) | null {
  let last: (Fast & { endedAt: number }) | null = null;
  for (const f of fasts) {
    if (f.endedAt !== null && (last === null || f.endedAt > last.endedAt)) last = f as Fast & { endedAt: number };
  }
  return last;
}

/** How long after a fast ends Home keeps tracking its eating window (open, then closed). */
export const EATING_STATE_MS = 24 * HOUR;

export type EatingSnapshot = {
  /** The fast whose end opened this window. */
  fast: Fast & { endedAt: number };
  startedAt: number;
  endsAt: number;
  elapsedMs: number;
  /** Negative once the window has closed. */
  remainingMs: number;
  progress: number;
  closed: boolean;
};

/**
 * The eating window between fasts at time `now`, or null while fasting, before
 * the first fast, or once the last fast ended more than a day ago.
 */
export function eatingSnapshot(fasts: Fast[], now: number): EatingSnapshot | null {
  if (fasts.some((f) => f.endedAt === null)) return null;
  const last = lastFinished(fasts);
  if (!last || now - last.endedAt >= EATING_STATE_MS) return null;
  const startedAt = last.endedAt;
  const endsAt = eatingWindowEndsAt(last);
  const elapsedMs = Math.max(0, now - startedAt);
  const total = endsAt - startedAt;
  return {
    fast: last,
    startedAt,
    endsAt,
    elapsedMs,
    remainingMs: endsAt - now,
    progress: total > 0 ? Math.min(elapsedMs / total, 1) : 1,
    closed: now >= endsAt,
  };
}

export type ValidationError ='start-in-future' | 'end-before-start' | 'too-long';

/** Guards for user-edited times. Fasts longer than 72h are treated as a typo. */
export function validateTimes(startedAt: number, endedAt: number | null, now: number): ValidationError | null {
  if (startedAt > now + MINUTE) return 'start-in-future';
  if (endedAt !== null && endedAt <= startedAt) return 'end-before-start';
  if ((endedAt ?? now) - startedAt > 72 * HOUR) return 'too-long';
  return null;
}
