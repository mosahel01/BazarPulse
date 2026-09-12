import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase } from './client.js';

async function main(): Promise<void> {
  const { db, close } = createDatabase();
  migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migrations applied successfully.');
  close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
