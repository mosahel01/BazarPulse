import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { DatabaseHandle } from '../../src/db/client.js';
import { createTestDatabase } from '../helpers/db.js';
import { authHeaders, registerUser, seedStocks, seedStocksFixture } from '../helpers/fixtures.js';

describe('posts API', () => {
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

  it('requires authentication to create a post', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      payload: { stockSymbol: 'TCS', title: 'No token', body: 'x'.repeat(50) },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects posts for unknown stocks', async () => {
    const token = await registerUser(app, 'post_writer');
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers: authHeaders(token),
      payload: { stockSymbol: 'NOPE', title: 'Bad stock', body: 'x'.repeat(50) },
    });
    expect(response.statusCode).toBe(404);
  });

  it('creates, retrieves, updates and deletes a post', async () => {
    const token = await registerUser(app, 'post_creator');
    const headers = authHeaders(token);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers,
      payload: { stockSymbol: 'TCS', title: 'Buy the dip', body: 'Support at 3600 looks solid.' },
    });
    expect(created.statusCode).toBe(201);
    const post = created.json().data;
    expect(post).toMatchObject({
      stockSymbol: 'TCS',
      title: 'Buy the dip',
      author: 'post_creator',
      comments: 0,
      upvotes: 0,
      downvotes: 0,
    });
    expect(post.id).toEqual(expect.any(Number));

    const fetched = await app.inject({ method: 'GET', url: `/api/v1/posts/${post.id}` });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().data.body).toBe('Support at 3600 looks solid.');

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/v1/posts/${post.id}`,
      headers,
      payload: { title: 'Buy the dip harder' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data.title).toBe('Buy the dip harder');

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/posts/${post.id}`,
      headers,
    });
    expect(removed.statusCode).toBe(204);

    const gone = await app.inject({ method: 'GET', url: `/api/v1/posts/${post.id}` });
    expect(gone.statusCode).toBe(404);
  });

  it('forbids editing someone elses post', async () => {
    const authorToken = await registerUser(app, 'other_author');
    const intruderToken = await registerUser(app, 'post_intruder');

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers: authHeaders(authorToken),
      payload: { stockSymbol: 'RELIANCE', title: 'Mine', body: 'x'.repeat(50) },
    });
    const postId = created.json().data.id as number;

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/v1/posts/${postId}`,
      headers: authHeaders(intruderToken),
      payload: { title: 'Hijack' },
    });
    expect(patched.statusCode).toBe(403);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/posts/${postId}`,
      headers: authHeaders(intruderToken),
    });
    expect(deleted.statusCode).toBe(403);
  });

  it('supports voting up, down and removing a vote', async () => {
    const token = await registerUser(app, 'post_voter');
    const headers = authHeaders(token);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers,
      payload: { stockSymbol: 'HDFCBANK', title: 'Vote me', body: 'x'.repeat(50) },
    });
    const postId = created.json().data.id as number;

    const up = await app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${postId}/vote`,
      headers,
      payload: { value: 1 },
    });
    expect(up.statusCode).toBe(200);
    expect(up.json().data).toMatchObject({ upvotes: 1, downvotes: 0, userVote: 1 });

    const switchDown = await app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${postId}/vote`,
      headers,
      payload: { value: -1 },
    });
    expect(switchDown.json().data).toMatchObject({ upvotes: 0, downvotes: 1, userVote: -1 });

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/posts/${postId}/vote`,
      headers,
    });
    expect(removed.json().data).toMatchObject({ upvotes: 0, downvotes: 0 });
    expect(removed.json().data).not.toHaveProperty('userVote');
  });

  it('adds and lists comments', async () => {
    const token = await registerUser(app, 'post_comments');
    const headers = authHeaders(token);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers,
      payload: { stockSymbol: 'TCS', title: 'Comment thread', body: 'x'.repeat(50) },
    });
    const postId = created.json().data.id as number;

    const comment = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${postId}/comments`,
      headers,
      payload: { body: 'Agreed, adding to watchlist.' },
    });
    expect(comment.statusCode).toBe(201);
    expect(comment.json().data).toMatchObject({
      postId,
      author: 'post_comments',
      body: 'Agreed, adding to watchlist.',
    });

    const listed = await app.inject({ method: 'GET', url: `/api/v1/posts/${postId}/comments` });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data).toHaveLength(1);
    expect(listed.json().data[0].body).toBe('Agreed, adding to watchlist.');
  });

  it('serves the ranked feed filtered by stock', async () => {
    const token = await registerUser(app, 'feed_writer');
    const headers = authHeaders(token);

    const tcsPost = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers,
      payload: { stockSymbol: 'TCS', title: 'TCS thesis', body: 'x'.repeat(50) },
    });
    const tcsId = tcsPost.json().data.id as number;

    await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers,
      payload: { stockSymbol: 'RELIANCE', title: 'Reliance thesis', body: 'x'.repeat(50) },
    });

    await app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${tcsId}/vote`,
      headers,
      payload: { value: 1 },
    });

    const feed = await app.inject({ method: 'GET', url: '/api/v1/feed' });
    expect(feed.statusCode).toBe(200);
    const feedTitles = feed.json().data.map((post: { title: string }) => post.title);
    expect(feedTitles).toContain('TCS thesis');
    expect(feedTitles).toContain('Reliance thesis');

    const tcsOnly = await app.inject({ method: 'GET', url: '/api/v1/feed?stock=TCS' });
    const symbols = tcsOnly.json().data.map((post: { stockSymbol: string }) => post.stockSymbol);
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols.every((symbol: string) => symbol === 'TCS')).toBe(true);
    expect(tcsOnly.json().data[0].upvotes).toBe(1);

    const top = await app.inject({ method: 'GET', url: '/api/v1/feed?sort=top' });
    expect(top.json().data[0].id).toBe(tcsId);
  });
});