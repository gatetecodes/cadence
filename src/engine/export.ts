import { durationMs, metGoal, type Fast } from './fast';
import { ratioFor } from './plans';
import { formatLocalDateTime, HOUR } from './time';

const COLUMNS = [
  'id',
  'plan',
  'goal_hours',
  'started_local',
  'ended_local',
  'started_utc',
  'ended_utc',
  'duration_hours',
  'met_goal',
  'note',
] as const;

/** RFC 4180 quoting, plus a guard so spreadsheets never run a note as a formula. */
function cell(value: string | number | null): string {
  if (value === null) return '';
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Fasts as CSV, oldest first. A running fast has empty end, duration and
 * met_goal cells. Times appear twice: local (for reading) and UTC (exact).
 */
export function fastsToCsv(fasts: Fast[]): string {
  const rows = [...fasts]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((f) => {
      const done = f.endedAt !== null;
      return [
        f.id,
        ratioFor(f.goalMinutes),
        round2(f.goalMinutes / 60),
        formatLocalDateTime(f.startedAt),
        done ? formatLocalDateTime(f.endedAt!) : null,
        new Date(f.startedAt).toISOString(),
        done ? new Date(f.endedAt!).toISOString() : null,
        done ? round2(durationMs(f, f.endedAt!) / HOUR) : null,
        done ? (metGoal(f) ? 'yes' : 'no') : null,
        f.note,
      ]
        .map(cell)
        .join(',');
    });
  return [COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}
