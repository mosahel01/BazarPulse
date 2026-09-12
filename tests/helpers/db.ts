import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase, type DatabaseHandle } from '../../src/db/client.js';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../src/db/migrations', import.meta.url));

export function createTestDatabase(): DatabaseHandle {
  const handle = createDatabase(':memory:');
  migrate(handle.db, { migrationsFolder: MIGRATIONS_FOLDER });
  return handle;
}
