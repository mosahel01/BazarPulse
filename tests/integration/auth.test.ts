import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { DatabaseHandle } from '../../src/db/client.js';
import { verifyGoogleIdToken } from '../../src/modules/auth/google.service.js';
import { createTestDatabase } from '../helpers/db.js';

vi.mock('../../src/modules/auth/google.service.js', () => ({
  verifyGoogleIdToken: vi.fn(),
}));

function loginBody(username: string, password: string): Record<string, unknown> {
  return { username, password };
}

describe('auth API', () => {
  let app: FastifyInstance;
  let database: DatabaseHandle;

  beforeAll(async () => {
    database = createTestDatabase();
    app = await buildApp({ logger: false, serveFrontend: false, database });
  });

  afterAll(async () => {
    await app.close();
    database.close();
  });

  beforeEach(() => {
    vi.mocked(verifyGoogleIdToken).mockReset();
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      sub: 'google-sub-123',
      email: 'gina@example.com',
      emailVerified: true,
      displayName: 'Gina Kapoor',
      picture: 'https://example.com/avatar.png',
    });
  });

  it('registers a user and returns a token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { username: 'trader_one', email: 'trader@example.com', password: 'Password123!' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.token).toEqual(expect.any(String));
    expect(body.data.user).toMatchObject({
      id: expect.any(Number),
      username: 'trader_one',
      email: 'trader@example.com',
      role: 'USER',
    });
    expect(body.data.user).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate username and duplicate email', async () => {
    const payload = { username: 'dup_user', email: 'dup@example.com', password: 'Password123!' };
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload,
    });
    expect(first.statusCode).toBe(201);

    const sameUsername = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { username: 'dup_user', email: 'other@example.com', password: 'Password123!' },
    });
    expect(sameUsername.statusCode).toBe(409);
    expect(sameUsername.json().error.code).toBe('CONFLICT');

    const sameEmail = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { username: 'dup_user2', email: 'dup@example.com', password: 'Password123!' },
    });
    expect(sameEmail.statusCode).toBe(409);

    const caseInsensitive = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { username: 'DUP_USER', email: 'other2@example.com', password: 'Password123!' },
    });
    expect(caseInsensitive.statusCode).toBe(409);
  });

  it('rejects invalid registration payloads with 400 VALIDATION_ERROR', async () => {
    const cases = [
      { username: '', email: 'x@example.com', password: 'Password123!' },
      { username: 'ab', email: 'x@example.com', password: 'Password123!' },
      { username: 'valid_user', email: 'not-an-email', password: 'Password123!' },
      { username: 'valid_user', email: 'x@example.com', password: 'short' },
      { username: 'bad chars!', email: 'x@example.com', password: 'Password123!' },
      { username: 'ok_user', email: 'x@example.com', password: 'Password123!', extra: 'nope' },
    ];

    for (const payload of cases) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
      expect(response.json().error.message).toBe('Invalid request');
    }
  });

  it('logs in with username and with email', async () => {
    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { username: 'login_demo', email: 'login@example.com', password: 'Password123!' },
    });
    expect(register.statusCode).toBe(201);

    const byUsername = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: loginBody('login_demo', 'Password123!'),
    });
    expect(byUsername.statusCode).toBe(200);
    expect(byUsername.json().data.user.username).toBe('login_demo');

    const byEmail = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: loginBody('LOGIN@EXAMPLE.COM', 'Password123!'),
    });
    expect(byEmail.statusCode).toBe(200);
    expect(byEmail.json().data.user.email).toBe('login@example.com');

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: loginBody('login_demo', 'WrongPassword!'),
    });
    expect(wrongPassword.statusCode).toBe(401);
    expect(wrongPassword.json().error.code).toBe('UNAUTHORIZED');

    const unknownUser = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: loginBody('no_such_user', 'Password123!'),
    });
    expect(unknownUser.statusCode).toBe(401);
    expect(unknownUser.json().error.message).toBe('Invalid username/email or password.');
  });

  it('requires authentication for /auth/me', async () => {
    const noToken = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });
    expect(noToken.statusCode).toBe(401);

    const badToken = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: 'Bearer not.a.jwt' },
    });
    expect(badToken.statusCode).toBe(401);
  });

  it('returns the current user from /auth/me with a valid token', async () => {
    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { username: 'me_user', email: 'me@example.com', password: 'Password123!' },
    });
    const token = register.json().data.token as string;

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.user).toMatchObject({ username: 'me_user', email: 'me@example.com' });
  });

  it('creates a user via Google sign-in', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { idToken: 'google-id-token' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.user).toMatchObject({
      username: 'ginakapoor',
      email: 'gina@example.com',
      emailVerified: true,
      role: 'USER',
    });
    expect(body.data.token).toEqual(expect.any(String));
    expect(vi.mocked(verifyGoogleIdToken)).toHaveBeenCalledWith('google-id-token', undefined);
  });

  it('returns the same account when the Google user signs in again', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { idToken: 'one' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { idToken: 'two' },
    });

    expect(second.statusCode).toBe(201);
    expect(second.json().data.user.id).toBe(first.json().data.user.id);
  });

  it('links an existing email account to Google on first Google sign-in', async () => {
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      sub: 'google-sub-link',
      email: 'link@example.com',
      emailVerified: true,
      displayName: undefined,
      picture: undefined,
    });

    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { username: 'link_user', email: 'link@example.com', password: 'Password123!' },
    });
    const passwordUserId = register.json().data.user.id as number;

    const google = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { idToken: 'link-token' },
    });

    expect(google.statusCode).toBe(201);
    expect(google.json().data.user.id).toBe(passwordUserId);
    expect(google.json().data.user.role).toBe('USER');
  });

  it('rejects an invalid Google credential', async () => {
    vi.mocked(verifyGoogleIdToken).mockRejectedValue({ statusCode: 401 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { idToken: 'bad-token' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('reports the available auth providers', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/providers' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.google).toBeNull();
  });

  it('reports readiness with database up', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'up' });
  });
});
