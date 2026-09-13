import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../common/errors/app-error.js';
import { paginationMeta } from '../../common/http/pagination.js';
import { FeedService } from '../feed/feed.service.js';
import { IdeasService } from '../ideas/ideas.service.js';
import { StocksService } from './stocks.service.js';

const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  sector: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const symbolParamSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((value) => value.toUpperCase()),
});

export async function registerStockRoutes(app: FastifyInstance): Promise<void> {
  const stocks = new StocksService(app.db, app.marketEngine);

  app.get('/api/v1/stocks', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const { rows, total } = await stocks.list({
      search: query.search,
      sector: query.sector,
      page: query.page,
      pageSize: query.pageSize,
    });
    return { data: rows, meta: paginationMeta(total, query.page, query.pageSize) };
  });

  app.get('/api/v1/stocks/:symbol', async (request) => {
    const { symbol } = symbolParamSchema.parse(request.params);
    const stock = await stocks.get(symbol);
    if (!stock) {
      throw AppError.notFound(`No stock with symbol ${symbol} exists.`);
    }
    return { data: stock };
  });

  const feed = new FeedService(app.db);
  const ideas = new IdeasService(app.db);

  app.get('/api/v1/stocks/:symbol/posts', async (request) => {
    const { symbol } = symbolParamSchema.parse(request.params);
    const result = await feed.getFeed({ stock: symbol, page: 1, pageSize: 20 });
    return { data: result.data };
  });

  app.get('/api/v1/stocks/:symbol/ideas', async (request) => {
    const { symbol } = symbolParamSchema.parse(request.params);
    const result = await ideas.list({ stock: symbol, page: 1, pageSize: 20 });
    return { data: result.rows };
  });
}