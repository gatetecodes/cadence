import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm';

import type { Fast } from '../engine/fast';
import { db } from './client';
import { badges, fasts, settings, waterLogs } from './schema';

type FastRow = typeof fasts.$inferSelect;

const toFast = (r: FastRow): Fast => ({
  id: r.id,
  planId: r.planId,
  goalMinutes: r.goalMinutes,
  startedAt: r.startedAt,
  endedAt: r.endedAt,
  note: r.note,
});

export const fastsRepo = {
  active(): Fast | null {
    const row = db.select().from(fasts).where(isNull(fasts.endedAt)).limit(1).get();
    return row ? toFast(row) : null;
  },

  /** Most recent fasts first. */
  list(limit = 400): Fast[] {
    return db.select().from(fasts).orderBy(desc(fasts.startedAt)).limit(limit).all().map(toFast);
  },

  /** Every fast, unbounded, for export. */
  all(): Fast[] {
    return db.select().from(fasts).all().map(toFast);
  },

  lastFinished(): Fast | null {
    const rows = db.select().from(fasts).orderBy(desc(fasts.endedAt)).limit(5).all();
    const row = rows.find((r) => r.endedAt !== null);
    return row ? toFast(row) : null;
  },

  start(input: { planId: string; goalMinutes: number; startedAt: number }): Fast {
    const now = Date.now();
    const row = db
      .insert(fasts)
      .values({ ...input, endedAt: null, note: null, createdAt: now, updatedAt: now })
      .returning()
      .get();
    return toFast(row);
  },

  end(id: number, endedAt: number): void {
    db.update(fasts).set({ endedAt, updatedAt: Date.now() }).where(eq(fasts.id, id)).run();
  },

  update(id: number, patch: Partial<Pick<Fast, 'startedAt' | 'endedAt' | 'goalMinutes' | 'planId' | 'note'>>): void {
    db.update(fasts).set({ ...patch, updatedAt: Date.now() }).where(eq(fasts.id, id)).run();
  },

  remove(id: number): void {
    db.delete(fasts).where(eq(fasts.id, id)).run();
  },
};

export const waterRepo = {
  add(amountMl: number, loggedAt = Date.now()): void {
    db.insert(waterLogs).values({ amountMl, loggedAt }).run();
  },

  /** Removes the most recent entry logged in [from, to). */
  undoLast(from: number, to: number): void {
    const last = db
      .select()
      .from(waterLogs)
      .where(and(gte(waterLogs.loggedAt, from), lt(waterLogs.loggedAt, to)))
      .orderBy(desc(waterLogs.loggedAt))
      .limit(1)
      .get();
    if (last) db.delete(waterLogs).where(eq(waterLogs.id, last.id)).run();
  },

  totalMl(from: number, to: number): number {
    const rows = db
      .select({ amountMl: waterLogs.amountMl })
      .from(waterLogs)
      .where(and(gte(waterLogs.loggedAt, from), lt(waterLogs.loggedAt, to)))
      .all();
    return rows.reduce((sum, r) => sum + r.amountMl, 0);
  },
};

export const badgesRepo = {
  keys(): Set<string> {
    return new Set(db.select({ key: badges.key }).from(badges).all().map((r) => r.key));
  },

  award(key: string, fastId: number | null): void {
    db.insert(badges).values({ key, fastId, earnedAt: Date.now() }).onConflictDoNothing().run();
  },
};

export const settingsRepo = {
  get<T>(key: string, fallback: T): T {
    const row = db.select().from(settings).where(eq(settings.key, key)).get();
    if (!row) return fallback;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    const json = JSON.stringify(value);
    db.insert(settings).values({ key, value: json }).onConflictDoUpdate({ target: settings.key, set: { value: json } }).run();
  },
};

/** Whole-database export for Settings → Export. */
export function exportAll() {
  return {
    exportedAt: new Date().toISOString(),
    fasts: db.select().from(fasts).all(),
    water: db.select().from(waterLogs).all(),
    badges: db.select().from(badges).all(),
    settings: db.select().from(settings).all(),
  };
}

export function resetAll(): void {
  db.delete(fasts).run();
  db.delete(waterLogs).run();
  db.delete(badges).run();
  db.delete(settings).run();
}
