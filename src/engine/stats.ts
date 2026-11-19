import { durationMs, metGoal, type Fast } from './fast';
import { addDays, dayKey, HOUR } from './time';
import { ZONES, zoneEndH, type ZoneId } from './zones';

export type DayBar = {
  key: string;
  /** Start-of-day timestamp, local time. */
  day: number;
  hours: number;
  metGoal: boolean;
  live: boolean;
};

/**
 * One bar per day for the last `days` days (oldest first, today last).
 * A fast counts toward the day it ended; a running fast counts toward today.
 */
export function dailyBars(fasts: Fast[], days: number, now: number): DayBar[] {
  const todayKey = dayKey(now);
  const bars: DayBar[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(now, -i);
    bars.push({ key: dayKey(day), day, hours: 0, metGoal: false, live: false });
  }
  const byKey = new Map(bars.map((b) => [b.key, b]));
  for (const f of fasts) {
    const key = dayKey(f.endedAt ?? now);
    const bar = byKey.get(key);
    if (!bar) continue;
    bar.hours += durationMs(f, now) / HOUR;
    if (f.endedAt === null && key === todayKey) bar.live = true;
    if (metGoal(f)) bar.metGoal = true;
  }
  return bars;
}

/** Hours spent in each zone by fasts overlapping [from, to). */
export function zoneHours(fasts: Fast[], from: number, to: number, now: number): Record<ZoneId, number> {
  const out = Object.fromEntries(ZONES.map((z) => [z.id, 0])) as Record<ZoneId, number>;
  for (const f of fasts) {
    const fEnd = f.endedAt ?? now;
    for (const z of ZONES) {
      const zs = f.startedAt + z.startH * HOUR;
      const ze = Math.min(f.startedAt + zoneEndH(z) * HOUR, fEnd);
      const s = Math.max(zs, from);
      const e = Math.min(ze, to);
      if (e > s) out[z.id] += (e - s) / HOUR;
    }
  }
  return out;
}

/**
 * Consecutive days, ending today, with at least one completed fast that met
 * its goal. If today has none yet, the streak can still end yesterday.
 */
export function currentStreak(fasts: Fast[], now: number): number {
  const goalDays = new Set(fasts.filter(metGoal).map((f) => dayKey(f.endedAt!)));
  let offset = goalDays.has(dayKey(now)) ? 0 : -1;
  let streak = 0;
  while (goalDays.has(dayKey(addDays(now, offset)))) {
    streak++;
    offset--;
  }
  return streak;
}

export function longestStreak(fasts: Fast[]): number {
  const keys = [...new Set(fasts.filter(metGoal).map((f) => dayKey(f.endedAt!)))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    if (prev !== null && dayKey(addDays(new Date(`${prev}T12:00:00`).getTime(), 1)) === k) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export type Summary = {
  fasts: number;
  totalHours: number;
  averageHours: number;
  onGoal: number;
  completed: number;
  longestHours: number;
};

/** Summary of fasts that ended (or are running) inside [from, to). */
export function summarize(fasts: Fast[], from: number, to: number, now: number): Summary {
  const inRange = fasts.filter((f) => {
    const end = f.endedAt ?? now;
    return end >= from && end < to;
  });
  const completed = inRange.filter((f) => f.endedAt !== null);
  const hours = inRange.map((f) => durationMs(f, now) / HOUR);
  const completedHours = completed.map((f) => durationMs(f, now) / HOUR);
  return {
    fasts: inRange.length,
    totalHours: hours.reduce((a, b) => a + b, 0),
    averageHours: completedHours.length ? completedHours.reduce((a, b) => a + b, 0) / completedHours.length : 0,
    onGoal: completed.filter(metGoal).length,
    completed: completed.length,
    longestHours: completedHours.length ? Math.max(...completedHours) : 0,
  };
}
