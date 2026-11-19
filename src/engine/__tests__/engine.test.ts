/// <reference types="jest" />
import { earnedBadges } from '../badges';
import { fastsToCsv } from '../export';
import { eatingSnapshot, snapshot, validateTimes, type Fast } from '../fast';
import { planNotifications, DEFAULT_NOTIFICATION_PREFS } from '../notificationPlan';
import { clampCustomGoalMinutes, eatingWindowMs, ratioFor } from '../plans';
import { currentStreak, dailyBars, longestStreak, summarize, zoneHours } from '../stats';
import { addDays, atTimeOfDay, formatAgo, formatClock, formatHM, HOUR, MINUTE, onDay, startOfDay } from '../time';
import { ringSegments, zoneAt } from '../zones';

const NOW = new Date(2026, 10, 18, 10, 32, 8).getTime(); // Wed 18 Nov 2026, 10:32:08 local

let nextId = 1;
function fast(startedAt: number, hours: number | null, goalH = 16): Fast {
  return {
    id: nextId++,
    planId: '16-8',
    goalMinutes: goalH * 60,
    startedAt,
    endedAt: hours === null ? null : startedAt + hours * HOUR,
    note: null,
  };
}

describe('zones', () => {
  it('maps elapsed hours to zones', () => {
    expect(zoneAt(0).id).toBe('anabolic');
    expect(zoneAt(4).id).toBe('catabolic');
    expect(zoneAt(14.5).id).toBe('fatBurning');
    expect(zoneAt(30).id).toBe('ketosis');
  });

  it('builds ring segments that stop at the elapsed time and the goal', () => {
    const segs = ringSegments(14.5, 16);
    expect(segs.map((s) => s.zone.id)).toEqual(['anabolic', 'catabolic', 'fatBurning']);
    expect(segs[0]).toMatchObject({ from: 0, to: 0.25 });
    expect(segs[2].to).toBeCloseTo(14.5 / 16);
    expect(ringSegments(30, 16).at(-1)!.to).toBe(1);
    expect(ringSegments(0, 16)).toEqual([]);
  });
});

describe('snapshot', () => {
  it('derives everything from timestamps', () => {
    const f = fast(NOW - (14 * HOUR + 32 * MINUTE + 8000), null);
    const s = snapshot(f, NOW);
    expect(formatClock(s.elapsedMs)).toBe('14:32:08');
    expect(s.zone.id).toBe('fatBurning');
    expect(s.nextZone?.id).toBe('ketosis');
    expect(formatHM(s.remainingMs)).toBe('1h 27m');
    expect(s.goalReached).toBe(false);
  });

  it('freezes at endedAt', () => {
    const f = fast(NOW - 20 * HOUR, 17);
    expect(snapshot(f, NOW).elapsedH).toBe(17);
    expect(snapshot(f, NOW).goalReached).toBe(true);
  });

  it('validates edited times', () => {
    expect(validateTimes(NOW + HOUR, null, NOW)).toBe('start-in-future');
    expect(validateTimes(NOW, NOW - 1, NOW)).toBe('end-before-start');
    expect(validateTimes(NOW - 100 * HOUR, null, NOW)).toBe('too-long');
    expect(validateTimes(NOW - 2 * HOUR, null, NOW)).toBeNull();
  });
});

describe('stats', () => {
  // One goal-meeting fast ending each of the last 3 days (today included), plus a short one.
  const fasts: Fast[] = [
    fast(addDays(NOW, -2) + 0 * HOUR, 16.5),
    fast(addDays(NOW, -1) - 8 * HOUR, 17),
    fast(addDays(NOW, 0) - 6 * HOUR, 16),
    fast(addDays(NOW, -5), 12),
  ];

  it('counts the current streak', () => {
    expect(currentStreak(fasts, NOW)).toBe(3);
    expect(longestStreak(fasts)).toBe(3);
  });

  it('keeps yesterday’s streak alive before today’s fast ends', () => {
    expect(currentStreak(fasts.slice(0, 2), NOW)).toBe(2);
  });

  it('builds daily bars with today last', () => {
    const bars = dailyBars([...fasts, fast(NOW - 2 * HOUR, null)], 7, NOW);
    expect(bars).toHaveLength(7);
    expect(bars.at(-1)!.live).toBe(true);
    expect(bars.at(-1)!.hours).toBeCloseTo(18);
  });

  it('splits hours across zones within a range', () => {
    const z = zoneHours([fast(NOW - 20 * HOUR, 17)], 0, Infinity, NOW);
    expect(z).toEqual({ anabolic: 4, catabolic: 8, fatBurning: 4, ketosis: 1 });
  });

  it('summarizes a range', () => {
    const s = summarize(fasts, addDays(NOW, -6), addDays(NOW, 1), NOW);
    expect(s.completed).toBe(4);
    expect(s.onGoal).toBe(3);
    expect(s.longestHours).toBe(17);
  });

  it('awards badges', () => {
    const b = earnedBadges(fasts, NOW);
    expect(b.has('first-fast')).toBe(true);
    expect(b.has('first-16h')).toBe(true);
    expect(b.has('first-20h')).toBe(false);
  });
});

describe('notification plan', () => {
  it('plans only future alerts for an active fast', () => {
    const f = fast(NOW - 14.5 * HOUR, null);
    const plan = planNotifications(f, null, DEFAULT_NOTIFICATION_PREFS, NOW);
    // Ketosis starts exactly at a 16h goal, so its zone alert is folded into the goal alert.
    expect(plan.map((n) => n.id)).toEqual(['almost', 'goal']);
    expect(plan.find((n) => n.id === 'goal')!.timeSensitive).toBe(true);
  });

  it('plans the eating-window alert after a fast ends', () => {
    const last = fast(NOW - 17 * HOUR, 16.5);
    const plan = planNotifications(null, last, DEFAULT_NOTIFICATION_PREFS, NOW);
    expect(plan).toHaveLength(1);
    expect(plan[0].at).toBe(last.endedAt! + 8 * HOUR - 30 * MINUTE);
  });
});

describe('eating window', () => {
  it('counts down from the end of the last fast', () => {
    // 16:8 fast that ended 3h ago: 5h of the 8h window left.
    const e = eatingSnapshot([fast(NOW - 19 * HOUR, 16), fast(NOW - 50 * HOUR, 16)], NOW)!;
    expect(e.startedAt).toBe(NOW - 3 * HOUR);
    expect(e.endsAt).toBe(NOW + 5 * HOUR);
    expect(e.remainingMs).toBe(5 * HOUR);
    expect(e.progress).toBeCloseTo(3 / 8);
    expect(e.closed).toBe(false);
  });

  it('uses the goal of the last fast for the window length', () => {
    const e = eatingSnapshot([fast(NOW - 20 * HOUR, 18, 18)], NOW)!;
    expect(e.endsAt).toBe(NOW - 2 * HOUR + 6 * HOUR);
  });

  it('reports a closed window, then nothing after a day', () => {
    const closed = eatingSnapshot([fast(NOW - 26 * HOUR, 16)], NOW)!;
    expect(closed.closed).toBe(true);
    expect(closed.progress).toBe(1);
    expect(eatingSnapshot([fast(NOW - 41 * HOUR, 16)], NOW)).toBeNull();
  });

  it('is null while fasting or before the first fast', () => {
    expect(eatingSnapshot([fast(NOW - 20 * HOUR, 16), fast(NOW - HOUR, null)], NOW)).toBeNull();
    expect(eatingSnapshot([], NOW)).toBeNull();
  });
});

describe('custom goals', () => {
  it('labels goals as ratios', () => {
    expect(ratioFor(16 * 60)).toBe('16:8');
    expect(ratioFor(17 * 60)).toBe('17:7');
    expect(ratioFor(16.5 * 60)).toBe('16h 30m');
  });

  it('clamps custom goals to whole hours in range', () => {
    expect(clampCustomGoalMinutes(17 * 60)).toBe(17 * 60);
    expect(clampCustomGoalMinutes(8 * 60)).toBe(12 * 60);
    expect(clampCustomGoalMinutes(30 * 60)).toBe(23 * 60);
    expect(clampCustomGoalMinutes(17 * 60 + 20)).toBe(17 * 60);
  });

  it('sizes the eating window from the goal of the last fast', () => {
    expect(eatingWindowMs(17 * 60)).toBe(7 * HOUR);
    const last = fast(NOW - 18 * HOUR, 17.5, 17);
    const plan = planNotifications(null, last, DEFAULT_NOTIFICATION_PREFS, NOW);
    expect(plan[0].at).toBe(last.endedAt! + 7 * HOUR - 30 * MINUTE);
    expect(plan[0].body).toContain('17:7');
  });
});

describe('CSV export', () => {
  it('writes a header and one row per fast, oldest first', () => {
    const a = fast(new Date(2026, 10, 17, 20, 0).getTime(), 16.5);
    const b = fast(new Date(2026, 10, 16, 20, 0).getTime(), 12);
    const lines = fastsToCsv([a, b]).trimEnd().split('\r\n');
    expect(lines[0]).toBe('id,plan,goal_hours,started_local,ended_local,started_utc,ended_utc,duration_hours,met_goal,note');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(',16:8,16,2026-11-16 20:00,2026-11-17 08:00,');
    expect(lines[1].endsWith(',12,no,')).toBe(true);
    expect(lines[2].endsWith(',16.5,yes,')).toBe(true);
  });

  it('leaves end cells empty for a running fast', () => {
    const line = fastsToCsv([fast(NOW - HOUR, null)]).trimEnd().split('\r\n')[1];
    const cells = line.split(',');
    expect(cells).toHaveLength(10);
    expect(cells[4]).toBe(''); // ended_local
    expect(cells[5]).not.toBe(''); // started_utc
    expect(cells.slice(6)).toEqual(['', '', '', '']); // ended_utc, duration, met_goal, note
  });

  it('quotes notes and defuses formulas', () => {
    const notes = fastsToCsv([
      { ...fast(NOW - 20 * HOUR, 16), note: 'felt "great", slept well' },
      { ...fast(NOW - 50 * HOUR, 16), note: '=HYPERLINK("x")' },
    ]);
    expect(notes).toContain(',"felt ""great"", slept well"\r\n');
    expect(notes).toContain(`,"'=HYPERLINK(""x"")"\r\n`);
  });
});

describe('time picker helpers', () => {
  it('sets a time of day on a given day', () => {
    expect(atTimeOfDay(NOW, 20, 5)).toBe(new Date(2026, 10, 18, 20, 5).getTime());
  });

  it('moves a timestamp to another day keeping the time', () => {
    const monday = startOfDay(new Date(2026, 10, 16).getTime());
    expect(onDay(NOW, monday)).toBe(new Date(2026, 10, 16, 10, 32, 8).getTime());
  });

  it('describes how long ago a time was', () => {
    expect(formatAgo(NOW - 30_000, NOW)).toBe('Just now');
    expect(formatAgo(NOW - 3 * HOUR - 10 * MINUTE, NOW)).toBe('3h 10m ago');
    expect(formatAgo(NOW + 20 * MINUTE, NOW)).toBe('in 20m');
  });
});
