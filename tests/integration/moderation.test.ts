import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { DatabaseHandle } from '../../src/db/client.js';
import { createTestDatabase } from '../helpers/db.js';
import { authHeaders, registerUser, seedStocks, seedStocksFixture } from '../helpers/fixtures.js';

describe('moderation API', () => {
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

  async function createPost(token: string, title: string): Promise<number> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers: authHeaders(token),
      payload: { stockSymbol: 'TCS', title, body: 'x'.repeat(50) },
    });
    return response.json().data.id as number;
  }

  function moderatorToken(userId: number): string {
    return app.jwt.sign({
      sub: String(userId),
      username: 'mod_user',
      role: 'MODERATOR',
      isActive: true,
    });
  }

  it('requires a target (postId xor commentId) for reports', async () => {
    const token = await registerUser(app, 'reporter_bad');
    const headers = authHeaders(token);

    const none = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers,
      payload: { reason: 'SPAM' },
    });
    expect(none.statusCode).toBe(400);

    const both = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers,
      payload: { postId: 1, commentId: 2, reason: 'SPAM' },
    });
    expect(both.statusCode).toBe(400);
  });

  it('reports a post and is idempotent for the same reporter', async () => {
    const token = await registerUser(app, 'reporting_user');
    const headers = authHeaders(token);
    const postId = await createPost(token, 'Spammy post');

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers,
      payload: { postId, reason: 'SPAM', description: 'Looks automated.' },
    });
    expect(first.statusCode).toBe(201);
    const report = first.json().data;
    expect(report).toMatchObject({ postId, reason: 'SPAM', status: 'OPEN' });

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers,
      payload: { postId, reason: 'SPAM' },
    });
    expect(second.statusCode).toBe(201);
    expect(second.json().data.id).toBe(report.id);
  });

  it('rejects reports for missing targets', async () => {
    const token = await registerUser(app, 'reporter_gone');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: authHeaders(token),
      payload: { postId: 999_999, reason: 'SPAM' },
    });
    expect(response.statusCode).toBe(404);
  });

  it('requires moderator role for moderation actions', async () => {
    const regular = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/reports',
      headers: authHeaders(await registerUser(app, 'not_a_mod')),
    });
    expect(regular.statusCode).toBe(403);

    const postId = await createPost(await registerUser(app, 'post_reporter'), 'Middling post');
    const hidden = await app.inject({
      method: 'POST',
      url: `/api/v1/moderation/posts/${postId}/hide`,
      headers: authHeaders(await registerUser(app, 'not_a_mod2')),
    });
    expect(hidden.statusCode).toBe(403);
  });

  it('lets a moderator hide and restore a post and review reports', async () => {
    const reporterToken = await registerUser(app, 'mod_reporter');
    const postId = await createPost(reporterToken, 'Questionable content');
    const report = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: authHeaders(reporterToken),
      payload: { postId, reason: 'HARASSMENT' },
    });
    const reportId = report.json().data.id as number;
    const reporterId = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: authHeaders(reporterToken),
      })
    ).json().data.user.id as number;
    const modToken = moderatorToken(reporterId);

    const hidden = await app.inject({
      method: 'POST',
      url: `/api/v1/moderation/posts/${postId}/hide`,
      headers: authHeaders(modToken),
    });
    expect(hidden.statusCode).toBe(204);

    const hiddenPost = await app.inject({ method: 'GET', url: `/api/v1/posts/${postId}` });
    expect(hiddenPost.statusCode).toBe(404);

    const restored = await app.inject({
      method: 'POST',
      url: `/api/v1/moderation/posts/${postId}/restore`,
      headers: authHeaders(modToken),
    });
    expect(restored.statusCode).toBe(204);
    const visible = await app.inject({ method: 'GET', url: `/api/v1/posts/${postId}` });
    expect(visible.statusCode).toBe(200);

    const lists = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/reports?status=OPEN',
      headers: authHeaders(modToken),
    });
    expect(lists.statusCode).toBe(200);
    expect(lists.json().data.map((r: { id: number }) => r.id)).toContain(reportId);

    const review = await app.inject({
      method: 'PATCH',
      url: `/api/v1/moderation/reports/${reportId}`,
      headers: authHeaders(modToken),
      payload: { status: 'RESOLVED' },
    });
    expect(review.statusCode).toBe(200);
    expect(review.json().data.status).toBe('RESOLVED');
  });
});