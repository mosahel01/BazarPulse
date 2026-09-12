import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/health/ready', async () => {
    app.sqlite.prepare('SELECT 1 AS ok').get();
    return { status: 'ok', database: 'up' };
  });

  await registerAuthRoutes(app);
}
