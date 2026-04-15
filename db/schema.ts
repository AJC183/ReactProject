import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: text('created_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
});

export const habits = sqliteTable('habits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  frequency: text('frequency').notNull(), // 'daily' | 'weekly'
  targetCount: integer('target_count').notNull().default(1),
  createdAt: text('created_at').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const habitLogs = sqliteTable('habit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  habitId: integer('habit_id').notNull().references(() => habits.id),
  loggedAt: text('logged_at').notNull(),
  value: real('value').notNull().default(1),
  note: text('note'),
});

export const targets = sqliteTable('targets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  habitId: integer('habit_id').notNull().references(() => habits.id),
  period: text('period').notNull(), // 'daily' | 'weekly' | 'monthly'
  targetCount: integer('target_count').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
});
