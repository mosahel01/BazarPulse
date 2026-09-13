import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StockRepository } from '../stocks/stocks.repository.js';
import { MarketService } from './market.service.js';

const gameRoundSchema = z
  .object({
    exclude: z.array(z.string().trim().min(1).max(20)).max(100).optional(),
  })
  .strict();

const quotesSchema = z.object({
  symbols: z
    .string()
    .trim()
    .transform((value) => value.split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))
    .optional(),
});

export async function registerMarketRoutes(app: FastifyInstance): Promise<void> {
  const market = new MarketService(app.marketEngine, new StockRepository(app.db));

  app.get('/api/v1/market/indices', async () => {
    const indices = await market.indices();
    return { data: indices };
  });

  app.get('/api/v1/market/quotes', async (request) => {
    const query = quotesSchema.parse(request.query);
    const quotes = await market.quotes(query.symbols ?? []);
    return { data: quotes };
  });

  app.get('/api/v1/market/engine', async () => ({
    data: { kind: market.engineKind },
  }));

  app.post('/api/v1/market/game/round', async (request) => {
    const body = gameRoundSchema.parse(request.body ?? {});
    const round = await market.gameRound(body.exclude ?? []);
    return { data: round };
  });
}