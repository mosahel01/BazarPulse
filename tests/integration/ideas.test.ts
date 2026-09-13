import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { DatabaseHandle } from '../../src/db/client.js';
import { createTestDatabase } from '../helpers/db.js';
import { authHeaders, registerUser, seedStocks, seedStocksFixture } from '../helpers/fixtures.js';

describe('ideas API', () => {
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

  it('requires authentication to create an idea', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ideas',
      payload: {
        stockSymbol: 'TCS',
        direction: 'BULLISH',
        entryPrice: 3700,
        targetPrice: 4100,
        stopLossPrice: 3500,
        thesis: 'Cloud pipeline momentum.',
      },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects ideas for unknown stocks', async () => {
    const token = await registerUser(app, 'idea_writer0');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ideas',
      headers: authHeaders(token),
      payload: {
        stockSymbol: 'NOPE',
        direction: 'BULLISH',
        entryPrice: 100,
        targetPrice: 120,
        stopLossPrice: 90,
        thesis: 'test',
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it('rejects invalid price combinations', async () => {
    const token = await registerUser(app, 'idea_writer1');
    const headers = authHeaders(token);

    const noTarget = await app.inject({
      method: 'POST',
      url: '/api/v1/ideas',
      headers,
      payload: {
        stockSymbol: 'TCS',
        direction: 'BULLISH',
        entryPrice: 3700,
        targetPrice: 3600,
        stopLossPrice: 3500,
        thesis: 'bad',
      },
    });
    expect(noTarget.statusCode).toBe(400);
    expect(noTarget.json().error.code).toBe('VALIDATION_ERROR');

    const noStop = await app.inject({
      method: 'POST',
      url: '/api/v1/ideas',
      headers,
      payload: {
        stockSymbol: 'TCS',
        direction: 'BEARISH',
        entryPrice: 3700,
        targetPrice: 3400,
        stopLossPrice: 3600,
        thesis: 'bad',
      },
    });
    expect(noStop.statusCode).toBe(400);
  });

  it('creates, retrieves and lists ideas', async () => {
    const token = await registerUser(app, 'idea_creator');
    const headers = authHeaders(token);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/ideas',
      headers,
      payload: {
        stockSymbol: 'TCS',
        direction: 'BULLISH',
        entryPrice: 3700,
        targetPrice: 4100,
        stopLossPrice: 3500,
        thesis: 'Cloud pipeline momentum keeps order flow growing.',
      },
    });
    expect(created.statusCode).toBe(201);
    const idea = created.json().data;
    expect(idea).toMatchObject({
      author: 'idea_creator',
      stockSymbol: 'TCS',
      direction: 'BULLISH',
      entryPrice: 3700,
      targetPrice: 4100,
      stopLossPrice: 3500,
      status: 'OPEN',
    });

    const fetched = await app.inject({ method: 'GET', url: `/api/v1/ideas/${idea.id}` });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().data.thesis).toContain('Cloud pipeline');

    const listed = await app.inject({ method: 'GET', url: '/api/v1/ideas?stock=TCS' });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data).toHaveLength(1);
    expect(listed.json().data[0].id).toBe(idea.id);
  });
});