export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, '0');

/** 14:32:08 style clock for a duration in ms. Negative values clamp to 0. */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** "1h 27m" style duration. */
export function formatHM(ms: number): string {
  const m = Math.max(0, Math.floor(ms / MINUTE));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm}m`;
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
}

/** Local calendar day key, e.g. 2026-11-18. Uses the device timezone. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local "2026-11-18 20:05", a format spreadsheets read as a date and time. */
export function formatLocalDateTime(ts: number): string {
  const d = new Date(ts);
  return `${dayKey(ts)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local midnight at the start of the day containing ts. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local midnight `n` days after the day containing ts (DST-safe). */
export function addDays(ts: number, n: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "Today, 12:00 PM" / "Yesterday, 8:00 PM" / "Mon, 8:00 PM". */
export function formatRelativeDayTime(ts: number, now: number): string {
  const diff = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  const time = formatTime(ts);
  if (diff === 0) return `Today, ${time}`;
  if (diff === -1) return `Yesterday, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  return `${new Date(ts).toLocaleDateString([], { weekday: 'short' })}, ${time}`;
}

/** The same calendar day as `day`, at hour24:minute:00 local time (DST-safe). */
export function atTimeOfDay(day: number, hour24: number, minute: number): number {
  const d = new Date(day);
  d.setHours(hour24, minute, 0, 0);
  return d.getTime();
}

/** Moves `ts` to the calendar day containing `day`, keeping its time of day. */
export function onDay(ts: number, day: number): number {
  const t = new Date(ts);
  const d = new Date(day);
  d.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
  return d.getTime();
}

/** Whether the device formats times on a 24-hour clock. */
export function uses24HourClock(): boolean {
  return !/[AaPp]\.?\s?[Mm]/.test(new Date(2020, 0, 1, 13).toLocaleTimeString([], { hour: 'numeric' }));
}

/** "Just now" / "45m ago" / "3h 10m ago" / "in 20m". */
export function formatAgo(ts: number, now: number): string {
  const diff = now - ts;
  if (Math.abs(diff) < MINUTE) return 'Just now';
  return diff > 0 ? `${formatHM(diff)} ago` : `in ${formatHM(-diff)}`;
}
