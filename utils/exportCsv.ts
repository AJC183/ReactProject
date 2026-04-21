// ─── CSV Export Utility ───────────────────────────────────────────────────────
// Queries all habit logs, formats as CSV, and opens the native share sheet via
// React Native's built-in Share API — no native rebuild required.

import { Share } from 'react-native';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { categories as categoriesTable, habits as habitsTable, habitLogs } from '@/db/schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wraps a value in quotes if it contains commas, quotes, or newlines. */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Exports all habit logs as CSV and opens the native share sheet.
 * Uses React Native's built-in Share API — works in Expo Go without a rebuild.
 *
 * CSV columns: Date, Habit, Category, Value, Note
 */
export async function exportHabitLogs(): Promise<void> {
  const rows = await db
    .select({
      loggedAt:     habitLogs.loggedAt,
      habitName:    habitsTable.name,
      categoryName: categoriesTable.name,
      value:        habitLogs.value,
      note:         habitLogs.note,
    })
    .from(habitLogs)
    .innerJoin(habitsTable, eq(habitLogs.habitId, habitsTable.id))
    .innerJoin(categoriesTable, eq(habitsTable.categoryId, categoriesTable.id))
    .orderBy(habitLogs.loggedAt);

  const header = 'Date,Habit,Category,Value,Note';
  const lines  = rows.map(r =>
    [
      escapeCsvField(r.loggedAt.slice(0, 10)),
      escapeCsvField(r.habitName),
      escapeCsvField(r.categoryName),
      escapeCsvField(r.value),
      escapeCsvField(r.note),
    ].join(','),
  );

  const csv = [header, ...lines].join('\n');

  const result = await Share.share(
    { title: 'Loop Habits Export', message: csv },
    { dialogTitle: 'Export Loop Habits' },
  );

  // User dismissed the share sheet — not an error, just a no-op
  if (result.action === Share.dismissedAction) return;
}
