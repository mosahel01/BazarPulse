import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerFeedRoutes } from './modules/feed/feed.routes.js';
import { registerIdeaRoutes } from './modules/ideas/ideas.routes.js';
import { registerMarketRoutes } from './modules/market/market.routes.js';
import { registerModerationRoutes } from './modules/moderation/moderation.routes.js';
import { registerPostRoutes } from './modules/posts/posts.routes.js';
import { registerStockRoutes } from './modules/stocks/stocks.routes.js';
import { registerWatchlistRoutes } from './modules/watchlists/watchlists.routes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/health/ready', async () => {
    app.sqlite.prepare('SELECT 1 AS ok').get();
    return { status: 'ok', database: 'up' };
  });

  await registerAuthRoutes(app);
  await registerMarketRoutes(app);
  await registerStockRoutes(app);
  await registerFeedRoutes(app);
  await registerPostRoutes(app);
  await registerIdeaRoutes(app);
  await registerWatchlistRoutes(app);
  await registerModerationRoutes(app);
}