import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { DatabaseHandle } from '../../src/db/client.js';
import { createTestDatabase } from '../helpers/db.js';
import { authHeaders, registerUser, seedStocks, seedStocksFixture } from '../helpers/fixtures.js';

describe('watchlists API', () => {
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

  it('requires authentication for every watchlist endpoint', async () => {
    const urls = [
      { method: 'GET', url: '/api/v1/watchlists' },
      { method: 'POST', url: '/api/v1/watchlists' },
      { method: 'GET', url: '/api/v1/watchlists/1' },
      { method: 'DELETE', url: '/api/v1/watchlists/1' },
    ] as const;
    for (const request of urls) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(401);
    }
  });

  it('creates, renames, lists and deletes a watchlist', async () => {
    const token = await registerUser(app, 'wl_owner');
    const headers = authHeaders(token);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/watchlists',
      headers,
      payload: { name: 'Blue chips' },
    });
    expect(created.statusCode).toBe(201);
    const list = created.json().data;
    expect(list).toMatchObject({ name: 'Blue chips', stocks: [] });
    expect(typeof list.id).toBe('number');

    const renamed = await app.inject({
      method: 'PATCH',
      url: `/api/v1/watchlists/${list.id}`,
      headers,
      payload: { name: 'Blue chips v2' },
    });
    expect(renamed.statusCode).toBe(200);
    expect(renamed.json().data.name).toBe('Blue chips v2');

    const all = await app.inject({ method: 'GET', url: '/api/v1/watchlists', headers });
    expect(all.statusCode).toBe(200);
    expect(all.json().data).toHaveLength(1);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/watchlists/${list.id}`,
      headers,
    });
    expect(removed.statusCode).toBe(204);

    const gone = await app.inject({ method: 'GET', url: `/api/v1/watchlists/${list.id}`, headers });
    expect(gone.statusCode).toBe(404);
  });

  it('adds and removes stocks from a watchlist', async () => {
    const token = await registerUser(app, 'wl_collector');
    const headers = authHeaders(token);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/watchlists',
      headers,
      payload: { name: 'Trackers' },
    });
    const listId = created.json().data.id as number;

    const added = await app.inject({
      method: 'POST',
      url: `/api/v1/watchlists/${listId}/stocks`,
      headers,
      payload: { symbol: 'tcs' },
    });
    expect(added.statusCode).toBe(200);
    expect(added.json().data.stocks).toEqual(['TCS']);

    const duplicateAdd = await app.inject({
      method: 'POST',
      url: `/api/v1/watchlists/${listId}/stocks`,
      headers,
      payload: { symbol: 'TCS' },
    });
    expect(duplicateAdd.json().data.stocks).toEqual(['TCS']);

    const missing = await app.inject({
      method: 'POST',
      url: `/api/v1/watchlists/${listId}/stocks`,
      headers,
      payload: { symbol: 'NOPE' },
    });
    expect(missing.statusCode).toBe(404);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/watchlists/${listId}/stocks/TCS`,
      headers,
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().data.stocks).toEqual([]);
  });

  it('only the owner can read or modify a watchlist', async () => {
    const ownerToken = await registerUser(app, 'wl_owner2');
    const otherToken = await registerUser(app, 'wl_intruder');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/watchlists',
      headers: authHeaders(ownerToken),
      payload: { name: 'Private' },
    });
    const listId = created.json().data.id as number;

    const read = await app.inject({
      method: 'GET',
      url: `/api/v1/watchlists/${listId}`,
      headers: authHeaders(otherToken),
    });
    expect(read.statusCode).toBe(404);

    const edit = await app.inject({
      method: 'DELETE',
      url: `/api/v1/watchlists/${listId}`,
      headers: authHeaders(otherToken),
    });
    expect(edit.statusCode).toBe(404);
  });
});