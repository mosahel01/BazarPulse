import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsSrc = join(root, 'src', 'db', 'migrations');
const migrationsDest = join(root, 'dist', 'db', 'migrations');

mkdirSync(join(root, 'dist', 'db'), { recursive: true });
cpSync(migrationsSrc, migrationsDest, { recursive: true });
console.log('Copied database migrations to dist/db/migrations');
