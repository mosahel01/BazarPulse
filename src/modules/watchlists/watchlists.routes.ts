import type { FastifyInstance, FastifyRequest } from 'fastify';
import { WatchlistsService } from './watchlists.service.js';
import {
  addStockSchema,
  createWatchlistSchema,
  renameWatchlistSchema,
  stockSymbolParamSchema,
  watchlistIdParamSchema,
} from './watchlists.schemas.js';

function userId(request: FastifyRequest): number {
  return Number(request.user.sub);
}

export async function registerWatchlistRoutes(app: FastifyInstance): Promise<void> {
  const service = new WatchlistsService(app.db);

  const authOptions = { preHandler: [app.authenticate] };

  app.get('/api/v1/watchlists', authOptions, async (request) => {
    const lists = await service.list(userId(request));
    return { data: lists };
  });

  app.post('/api/v1/watchlists', authOptions, async (request, reply) => {
    const input = createWatchlistSchema.parse(request.body);
    const list = await service.create(userId(request), input.name);
    return reply.code(201).send({ data: list });
  });

  app.get('/api/v1/watchlists/:id', authOptions, async (request) => {
    const { id } = watchlistIdParamSchema.parse(request.params);
    const list = await service.get(userId(request), id);
    return { data: list };
  });

  app.patch('/api/v1/watchlists/:id', authOptions, async (request) => {
    const { id } = watchlistIdParamSchema.parse(request.params);
    const input = renameWatchlistSchema.parse(request.body);
    const list = await service.rename(userId(request), id, input.name);
    return { data: list };
  });

  app.delete('/api/v1/watchlists/:id', authOptions, async (request, reply) => {
    const { id } = watchlistIdParamSchema.parse(request.params);
    await service.remove(userId(request), id);
    return reply.code(204).send();
  });

  app.post('/api/v1/watchlists/:id/stocks', authOptions, async (request) => {
    const { id } = watchlistIdParamSchema.parse(request.params);
    const input = addStockSchema.parse(request.body);
    const list = await service.addStock(userId(request), id, input.symbol);
    return { data: list };
  });

  app.delete('/api/v1/watchlists/:id/stocks/:symbol', authOptions, async (request) => {
    const { id } = watchlistIdParamSchema.parse(request.params);
    const { symbol } = stockSymbolParamSchema.parse(request.params);
    const list = await service.removeStock(userId(request), id, symbol);
    return { data: list };
  });
}