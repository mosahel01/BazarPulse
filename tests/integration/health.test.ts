import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { DatabaseHandle } from '../../src/db/client.js';
import { createTestDatabase } from '../helpers/db.js';

async function createTestApp(): Promise<{ app: FastifyInstance; database: DatabaseHandle }> {
  const database = createTestDatabase();
  const app = await buildApp({ logger: false, serveFrontend: false, database });
  return { app, database };
}

describe('health endpoints', () => {
  let app: FastifyInstance;
  let database: DatabaseHandle;

  beforeAll(async () => {
    ({ app, database } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
    database.close();
  });

  it('GET /health returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /health/ready returns 200 with status ok and database up', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', database: 'up' });
  });
});

describe('error response shape', () => {
  let app: FastifyInstance;
  let database: DatabaseHandle;

  beforeAll(async () => {
    ({ app, database } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
    database.close();
  });

  it('unknown routes return the NOT_FOUND error shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /api/v1/nope not found' },
    });
  });
});

describe('boot hardening', () => {
  it('applies database migrations automatically when no handle is injected', async () => {
    const app = await buildApp({ logger: false, serveFrontend: false });

    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', database: 'up' });

    const tables = app.sqlite
      .prepare(
        "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'posts', 'stocks', 'watchlists')",
      )
      .get() as { n: number };
    expect(tables.n).toBe(4);

    await app.close();
  });

  it('sends base security headers on responses', async () => {
    const database = createTestDatabase();
    const app = await buildApp({ logger: false, serveFrontend: false, database });

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');

    await app.close();
    database.close();
  });

  it('reports a consistent error shape for oversized payloads', async () => {
    const database = createTestDatabase();
    const app = await buildApp({ logger: false, serveFrontend: false, database });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'a'.repeat(2 * 1024 * 1024), password: 'x' },
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
    database.close();
  });
});
