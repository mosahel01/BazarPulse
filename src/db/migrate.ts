import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate as runMigrations } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import type * as schema from './schema.js';
import { createDatabase } from './client.js';

export function migrationsFolder(): string {
  return fileURLToPath(new URL('./migrations', import.meta.url));
}

export function applyMigrations(db: BetterSQLite3Database<typeof schema>): void {
  runMigrations(db, { migrationsFolder: migrationsFolder() });
}

async function main(): Promise<void> {
  const { db, close } = createDatabase();
  applyMigrations(db);
  console.log('Migrations applied successfully.');
  close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
