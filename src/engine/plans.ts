import { colors } from '../theme/tokens';
import { formatHM, HOUR, MINUTE } from './time';

export type PlanLevel = 'beginner' | 'intermediate' | 'advanced';

export type Plan = {
  id: string;
  ratio: string;
  name: string;
  fastHours: number;
  level: PlanLevel;
  color: string;
  dark?: boolean;
  popular?: boolean;
};

export const PLANS: readonly Plan[] = [
  { id: '13-11', ratio: '13:11', name: 'Circadian', fastHours: 13, level: 'beginner', color: colors.green },
  { id: '16-8', ratio: '16:8', name: 'Lean Gains', fastHours: 16, level: 'beginner', color: colors.orange, popular: true },
  { id: '18-6', ratio: '18:6', name: 'Fat Burner', fastHours: 18, level: 'intermediate', color: colors.yellow },
  { id: '20-4', ratio: '20:4', name: 'Warrior', fastHours: 20, level: 'advanced', color: colors.lavender },
  { id: '23-1', ratio: '23:1', name: 'One meal', fastHours: 23, level: 'advanced', color: colors.brown, dark: true },
] as const;

export const DEFAULT_PLAN_ID = '18-6';

/** Plan id recorded on fasts that use a custom goal instead of a preset plan. */
export const CUSTOM_PLAN_ID = 'custom';

/** Bounds for a custom goal, in whole hours. Fasts over 24h are an open product question. */
export const CUSTOM_GOAL_HOURS = { min: 12, max: 23 } as const;

export function clampCustomGoalMinutes(minutes: number): number {
  const hours = Math.round(minutes / 60);
  return Math.min(CUSTOM_GOAL_HOURS.max, Math.max(CUSTOM_GOAL_HOURS.min, hours)) * 60;
}

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS.find((p) => p.id === DEFAULT_PLAN_ID)!;
}

/** "16:8" for a whole-hour goal within a day, otherwise a duration such as "16h 30m". */
export function ratioFor(goalMinutes: number): string {
  const h = goalMinutes / 60;
  return Number.isInteger(h) && h > 0 && h <= 24 ? `${h}:${24 - h}` : formatHM(goalMinutes * MINUTE);
}

/** Length of the eating window that follows a fast with this goal, in ms. */
export function eatingWindowMs(goalMinutes: number): number {
  return Math.max(0, 24 * HOUR - goalMinutes * MINUTE);
}
