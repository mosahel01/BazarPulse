import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from './config/config.js';
import type { DatabaseHandle } from './db/client.js';
import { registerAuth } from './plugins/auth.js';
import { registerDatabase } from './plugins/db.js';
import { registerErrorHandlers } from './plugins/error-handler.js';
import { registerRoutes } from './routes.js';

export interface BuildAppOptions {
  logger?: boolean | { level: string };
  serveFrontend?: boolean;
  database?: DatabaseHandle;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger === undefined ? config.logger : options.logger,
    trustProxy: config.isProduction,
    bodyLimit: 1 * 1024 * 1024,
    connectionTimeout: 30_000,
    requestTimeout: 30_000,
  });

  app.decorate('config', config);

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return payload;
  });

  registerDatabase(app, options.database);

  await app.register(fastifyRateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  await registerAuth(app);

  const serveFrontend = options.serveFrontend ?? true;
  if (serveFrontend) {
    const frontendDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
    await app.register(fastifyStatic, { root: frontendDir });
  }

  registerErrorHandlers(app);
  await registerRoutes(app);

  return app;
}
