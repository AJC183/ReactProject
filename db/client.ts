import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

const sqlite = openDatabaseSync('students.db');

sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    major TEXT NOT NULL,
    year TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
  );
`);

sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL
  );
`);

sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    frequency TEXT NOT NULL,
    target_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );
`);

sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL REFERENCES habits(id),
    logged_at TEXT NOT NULL,
    value REAL NOT NULL DEFAULT 1,
    note TEXT
  );
`);

sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL REFERENCES habits(id),
    period TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT
  );
`);

export const db = drizzle(sqlite);
