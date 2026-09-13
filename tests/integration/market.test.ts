import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { DatabaseHandle } from '../../src/db/client.js';
import { createTestDatabase } from '../helpers/db.js';
import { seedStocks, seedStocksFixture } from '../helpers/fixtures.js';

describe('market API', () => {
  let app: FastifyInstance;
  let database: DatabaseHandle;

  beforeAll(async () => {
    database = createTestDatabase();
    seedStocks(database, seedStocksFixture);
    app = await buildApp({ logger: false, serveFrontend: false, database });
  });

  afterAll(async () => {
    await app.close();
    database.close();
  });

  it('reports the engine kind as ts in tests', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/market/engine' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.kind).toBe('ts');
  });

  it('returns deterministic indices', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/market/indices' });
    expect(response.statusCode).toBe(200);
    const indices = response.json().data;
    expect(indices.length).toBe(4);
    for (const index of indices) {
      expect(index).toMatchObject({
        name: expect.any(String),
        value: expect.any(Number),
        change: expect.any(Number),
        changePct: expect.any(Number),
      });
    }
    const again = await app.inject({ method: 'GET', url: '/api/v1/market/indices' });
    expect(again.json().data).toEqual(indices);
  });

  it('returns quotes for seeded stocks', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/market/quotes?symbols=TCS,RELIANCE',
    });
    expect(response.statusCode).toBe(200);
    const quotes = response.json().data;
    expect(quotes.map((quote: { symbol: string }) => quote.symbol).sort()).toEqual(['RELIANCE', 'TCS']);
    for (const quote of quotes) {
      expect(quote).toMatchObject({
        symbol: expect.any(String),
        price: expect.any(Number),
        change: expect.any(Number),
        changePct: expect.any(Number),
      });
    }
  });

  it('ignores unknown symbols in quotes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/market/quotes?symbols=NOPE,TCS',
    });
    expect(response.statusCode).toBe(200);
    const quotes = response.json().data;
    expect(quotes).toHaveLength(1);
    expect(quotes[0].symbol).toBe('TCS');
  });

  it('returns an empty quotes list for unknown-only requests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/market/quotes?symbols=NOPE',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([]);
  });

  it('starts a game round and honours the exclude list', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/market/game/round',
      payload: {},
    });
    expect(first.statusCode).toBe(200);
    const round = first.json().data;
    expect(round.symbol).toEqual(expect.any(String));
    expect(typeof round.startPrice).toBe('number');
    expect(typeof round.endPrice).toBe('number');

    const excluded = await app.inject({
      method: 'POST',
      url: '/api/v1/market/game/round',
      payload: { exclude: [round.symbol] },
    });
    expect(excluded.statusCode).toBe(200);
    expect(excluded.json().data.symbol).not.toBe(round.symbol);
  });
});