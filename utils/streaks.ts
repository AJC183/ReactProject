// ─── Streak Utilities ─────────────────────────────────────────────────────────
// All functions operate on plain date strings (YYYY-MM-DD) and are pure —
// no DB calls, no side effects.  Callers are responsible for filtering logs
// to the relevant habitId before passing them in.

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today as YYYY-MM-DD in local time. */
export function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Adds `n` days to a YYYY-MM-DD string and returns the new YYYY-MM-DD. */
function shiftDay(ymd: string, n: number): string {
  const d = new Date(ymd + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns the ISO week string (YYYY-Www) for a YYYY-MM-DD date. */
function isoWeek(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00');
  // Thursday of the same week determines the ISO year
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const jan4 = new Date(thursday.getFullYear(), 0, 4);
  const week = Math.round(
    ((thursday.getTime() - jan4.getTime()) / 86400000 + ((jan4.getDay() + 6) % 7)) / 7,
  ) + 1;
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Deduplicate and sort an array of YYYY-MM-DD strings ascending. */
function uniqueSortedAsc(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Current consecutive-day streak up to today.
 *
 * One-day grace: if today has no log yet we still check from yesterday, so a
 * streak doesn't break mid-day just because the habit hasn't been logged yet.
 */
export function calculateCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const set     = new Set(dates);
  const today   = todayYMD();
  const hasToday = set.has(today);

  // Start checking from today if logged, otherwise from yesterday
  let cursor = hasToday ? today : shiftDay(today, -1);
  if (!set.has(cursor)) return 0;

  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/**
 * Longest ever consecutive-day streak across all available log dates.
 */
export function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted  = uniqueSortedAsc(dates);
  let longest   = 1;
  let current   = 1;

  for (let i = 1; i < sorted.length; i++) {
    const expected = shiftDay(sorted[i - 1], 1);
    if (sorted[i] === expected) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

/**
 * Current consecutive-week streak where the total logged value for each week
 * met or exceeded `targetCount`.
 *
 * Walks backwards from the most recent completed week (or the current week if
 * it already meets the target).
 */
export function calculateWeeklyStreak(
  dates: string[],
  valuesByDate: Record<string, number>,
  targetCount: number,
): number {
  if (dates.length === 0) return 0;

  // Aggregate totals per ISO week
  const weekTotals = new Map<string, number>();
  for (const ymd of dates) {
    const w = isoWeek(ymd);
    weekTotals.set(w, (weekTotals.get(w) ?? 0) + (valuesByDate[ymd] ?? 1));
  }

  // Sort weeks descending
  const weeks = [...weekTotals.keys()].sort().reverse();
  if (weeks.length === 0) return 0;

  let streak = 0;
  for (const w of weeks) {
    if ((weekTotals.get(w) ?? 0) >= targetCount) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
