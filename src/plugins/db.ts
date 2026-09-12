import type { FastifyInstance } from 'fastify';
import { createDatabase, type DatabaseHandle } from '../db/client.js';
import { applyMigrations } from '../db/migrate.js';

export function registerDatabase(app: FastifyInstance, handle?: DatabaseHandle): void {
  const dbHandle = handle ?? createDatabase();

  app.decorate('db', dbHandle.db);
  app.decorate('sqlite', dbHandle.sqlite);

  if (!handle) {
    applyMigrations(dbHandle.db);
    app.addHook('onClose', () => {
      dbHandle.close();
    });
  }
}
