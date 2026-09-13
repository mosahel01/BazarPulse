import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { DatabaseHandle } from '../../src/db/client.js';
import { createTestDatabase } from '../helpers/db.js';
import { seedStocks, seedStocksFixture } from '../helpers/fixtures.js';

describe('stocks API', () => {
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

  it('lists all stocks with live quotes', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/stocks' });
    expect(response.statusCode).toBe(200);
    const { data, meta } = response.json();
    expect(meta.total).toBe(3);
    expect(data).toHaveLength(3);
    for (const stock of data) {
      expect(stock).toMatchObject({
        symbol: expect.any(String),
        companyName: expect.any(String),
        exchange: 'NSE',
        sector: expect.any(String),
        price: expect.any(Number),
        change: expect.any(Number),
        changePct: expect.any(Number),
      });
    }
  });

  it('searches by symbol substring', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stocks?search=TC&pageSize=10',
    });
    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.map((stock: { symbol: string }) => stock.symbol)).toEqual(['TCS']);
  });

  it('filters by sector', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/stocks?sector=banking',
    });
    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.map((stock: { symbol: string }) => stock.symbol)).toEqual(['HDFCBANK']);
  });

  it('returns a single stock by symbol', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/stocks/TCS' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      symbol: 'TCS',
      companyName: 'Tata Consultancy Services',
    });
  });

  it('returns 404 for an unknown symbol', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/stocks/NOPE' });
    expect(response.statusCode).toBe(404);
  });

  it('exposes empty posts and ideas collections per stock', async () => {
    const posts = await app.inject({ method: 'GET', url: '/api/v1/stocks/TCS/posts' });
    expect(posts.statusCode).toBe(200);
    expect(posts.json().data).toEqual([]);

    const ideas = await app.inject({ method: 'GET', url: '/api/v1/stocks/TCS/ideas' });
    expect(ideas.statusCode).toBe(200);
    expect(ideas.json().data).toEqual([]);
  });
});