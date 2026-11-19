import { durationMs, metGoal, type Fast } from './fast';
import { longestStreak } from './stats';
import { HOUR } from './time';

export type BadgeKey = 'first-fast' | 'first-16h' | 'first-20h' | 'streak-7' | 'streak-30' | 'fasts-50';

export type BadgeDef = { key: BadgeKey; title: string; description: string };

export const BADGES: readonly BadgeDef[] = [
  { key: 'first-fast', title: 'First fast', description: 'Completed your first fast' },
  { key: 'first-16h', title: '16 hours', description: 'Fasted 16 hours or more' },
  { key: 'first-20h', title: '20 hours', description: 'Fasted 20 hours or more' },
  { key: 'streak-7', title: '7-day streak', description: 'Hit your goal 7 days in a row' },
  { key: 'streak-30', title: '30-day streak', description: 'Hit your goal 30 days in a row' },
  { key: 'fasts-50', title: '50 fasts', description: 'Completed 50 fasts' },
] as const;

/** Badge keys earned by this history. Pure: callers diff against stored badges. */
export function earnedBadges(fasts: Fast[], now: number): Set<BadgeKey> {
  const done = fasts.filter((f) => f.endedAt !== null);
  const longestH = Math.max(0, ...done.map((f) => durationMs(f, now) / HOUR));
  const streak = longestStreak(fasts);
  const out = new Set<BadgeKey>();
  if (done.length >= 1) out.add('first-fast');
  if (longestH >= 16) out.add('first-16h');
  if (longestH >= 20) out.add('first-20h');
  if (streak >= 7) out.add('streak-7');
  if (streak >= 30) out.add('streak-30');
  if (done.filter(metGoal).length >= 50 || done.length >= 50) out.add('fasts-50');
  return out;
}
