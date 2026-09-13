import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { FeedService } from './feed.service.js';
import { FEED_SORTS } from './feed.ranking.js';

const feedQuerySchema = z.object({
  stock: z.string().trim().min(1).max(20).optional(),
  sort: z.enum(FEED_SORTS).default('latest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export async function registerFeedRoutes(app: FastifyInstance): Promise<void> {
  const feedService = new FeedService(app.db);

  app.get('/api/v1/feed', async (request) => {
    const query = feedQuerySchema.parse(request.query);
    const feed = await feedService.getFeed(
      {
        stock: query.stock,
        sort: query.sort,
        page: query.page,
        pageSize: query.pageSize,
      },
      currentUserId(request),
    );
    return { data: feed.data, meta: feed.meta };
  });
}

function currentUserId(request: FastifyRequest): number | undefined {
  try {
    if (request.user?.sub) {
      return Number(request.user.sub);
    }
  } catch {
    return undefined;
  }
  return undefined;
}