import { db } from './client';
import { categories, habits, habitLogs, targets } from './schema';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedIfEmpty() {
  const existing = await db.select().from(categories);
  if (existing.length > 0) return;

  // ── Categories ──────────────────────────────────────────────────────────────
  const insertedCategories = await db
    .insert(categories)
    .values([
      { name: 'Health',     color: '#4CAF50', icon: 'heart'       },
      { name: 'Fitness',    color: '#2196F3', icon: 'barbell'     },
      { name: 'Mindfulness', color: '#9C27B0', icon: 'leaf'       },
      { name: 'Learning',   color: '#FF9800', icon: 'book-open'   },
    ])
    .returning();

  const [health, fitness, mindfulness, learning] = insertedCategories;

  // ── Habits ───────────────────────────────────────────────────────────────────
  const insertedHabits = await db
    .insert(habits)
    .values([
      {
        name: 'Drink 8 Glasses of Water',
        description: 'Stay hydrated throughout the day',
        categoryId: health.id,
        frequency: 'daily',
        targetCount: 8,
        createdAt: daysAgo(30),
        isActive: true,
      },
      {
        name: 'Sleep 8 Hours',
        description: 'Get enough rest every night',
        categoryId: health.id,
        frequency: 'daily',
        targetCount: 1,
        createdAt: daysAgo(30),
        isActive: true,
      },
      {
        name: 'Morning Run',
        description: '30-minute run before breakfast',
        categoryId: fitness.id,
        frequency: 'daily',
        targetCount: 1,
        createdAt: daysAgo(30),
        isActive: true,
      },
      {
        name: 'Strength Training',
        description: 'Full body workout at the gym',
        categoryId: fitness.id,
        frequency: 'weekly',
        targetCount: 3,
        createdAt: daysAgo(30),
        isActive: true,
      },
      {
        name: 'Meditation',
        description: '10 minutes of mindful meditation',
        categoryId: mindfulness.id,
        frequency: 'daily',
        targetCount: 1,
        createdAt: daysAgo(30),
        isActive: true,
      },
      {
        name: 'Journaling',
        description: 'Write in journal before bed',
        categoryId: mindfulness.id,
        frequency: 'daily',
        targetCount: 1,
        createdAt: daysAgo(30),
        isActive: true,
      },
      {
        name: 'Read 20 Pages',
        description: 'Read a non-fiction book',
        categoryId: learning.id,
        frequency: 'daily',
        targetCount: 20,
        createdAt: daysAgo(30),
        isActive: true,
      },
      {
        name: 'Practice Coding',
        description: 'Solve one LeetCode problem or build a feature',
        categoryId: learning.id,
        frequency: 'daily',
        targetCount: 1,
        createdAt: daysAgo(30),
        isActive: true,
      },
    ])
    .returning();

  const [water, sleep, run, strength, meditation, journal, reading, coding] = insertedHabits;

  // ── Targets ──────────────────────────────────────────────────────────────────
  await db.insert(targets).values([
    { habitId: water.id,      period: 'daily',   targetCount: 8,  startDate: daysAgo(30), endDate: null },
    { habitId: sleep.id,      period: 'daily',   targetCount: 1,  startDate: daysAgo(30), endDate: null },
    { habitId: run.id,        period: 'weekly',  targetCount: 5,  startDate: daysAgo(30), endDate: null },
    { habitId: strength.id,   period: 'weekly',  targetCount: 3,  startDate: daysAgo(30), endDate: null },
    { habitId: meditation.id, period: 'daily',   targetCount: 1,  startDate: daysAgo(30), endDate: null },
    { habitId: journal.id,    period: 'daily',   targetCount: 1,  startDate: daysAgo(30), endDate: null },
    { habitId: reading.id,    period: 'daily',   targetCount: 20, startDate: daysAgo(30), endDate: null },
    { habitId: coding.id,     period: 'daily',   targetCount: 1,  startDate: daysAgo(30), endDate: null },
  ]);

  // ── Habit Logs ───────────────────────────────────────────────────────────────
  // Build logs spread over the last 30 days per habit with realistic completion rates
  const logEntries: {
    habitId: number;
    loggedAt: string;
    value: number;
    note: string | null;
  }[] = [];

  // Water — logged most days, value = glasses consumed (5–9)
  for (let i = 0; i <= 30; i++) {
    if (Math.random() > 0.15) {
      logEntries.push({ habitId: water.id, loggedAt: daysAgo(i), value: randomBetween(5, 9), note: null });
    }
  }

  // Sleep — logged most days, value = hours slept (6–9)
  for (let i = 0; i <= 30; i++) {
    if (Math.random() > 0.1) {
      logEntries.push({ habitId: sleep.id, loggedAt: daysAgo(i), value: randomBetween(6, 9), note: null });
    }
  }

  // Morning Run — logged ~70% of days
  for (let i = 0; i <= 30; i++) {
    if (Math.random() > 0.3) {
      logEntries.push({ habitId: run.id, loggedAt: daysAgo(i), value: 1, note: null });
    }
  }

  // Strength Training — 3x per week (~12–13 times over 30 days)
  for (let i = 0; i <= 30; i++) {
    if (i % 2 === 0 && Math.random() > 0.25) {
      logEntries.push({ habitId: strength.id, loggedAt: daysAgo(i), value: 1, note: null });
    }
  }

  // Meditation — logged ~80% of days
  for (let i = 0; i <= 30; i++) {
    if (Math.random() > 0.2) {
      logEntries.push({ habitId: meditation.id, loggedAt: daysAgo(i), value: 1, note: null });
    }
  }

  // Journaling — logged ~60% of days
  const journalNotes = [
    'Felt calm and grateful today.',
    'Stressed but wrote it out.',
    'Good reflection session.',
    null,
    'Short entry but meaningful.',
  ];
  for (let i = 0; i <= 30; i++) {
    if (Math.random() > 0.4) {
      const note = journalNotes[randomBetween(0, journalNotes.length - 1)];
      logEntries.push({ habitId: journal.id, loggedAt: daysAgo(i), value: 1, note });
    }
  }

  // Reading — logged ~75% of days, value = pages read (10–35)
  for (let i = 0; i <= 30; i++) {
    if (Math.random() > 0.25) {
      logEntries.push({ habitId: reading.id, loggedAt: daysAgo(i), value: randomBetween(10, 35), note: null });
    }
  }

  // Coding — logged ~65% of days
  for (let i = 0; i <= 30; i++) {
    if (Math.random() > 0.35) {
      logEntries.push({ habitId: coding.id, loggedAt: daysAgo(i), value: 1, note: null });
    }
  }

  await db.insert(habitLogs).values(logEntries);
}
