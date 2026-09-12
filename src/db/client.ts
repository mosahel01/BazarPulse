import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '../config/env.js';
import * as schema from './schema.js';

export interface DatabaseHandle {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
  close: () => void;
}

export function createDatabase(path?: string): DatabaseHandle {
  const resolved =
    path ?? (env.SQLITE_DATABASE_PATH === ':memory:' ? ':memory:' : env.SQLITE_DATABASE_PATH);

  if (resolved !== ':memory:') {
    mkdirSync(dirname(resolved), { recursive: true });
  }

  const sqlite = new Database(resolved);
  if (resolved !== ':memory:') {
    sqlite.pragma('journal_mode = WAL');
  }
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  return {
    sqlite,
    db,
    close: () => {
      sqlite.close();
    },
  };
}
