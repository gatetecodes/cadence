import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const fasts = sqliteTable('fasts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: text('plan_id').notNull(),
  goalMinutes: integer('goal_minutes').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const waterLogs = sqliteTable('water_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amountMl: integer('amount_ml').notNull(),
  loggedAt: integer('logged_at').notNull(),
});

export const badges = sqliteTable('badges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  earnedAt: integer('earned_at').notNull(),
  fastId: integer('fast_id'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
