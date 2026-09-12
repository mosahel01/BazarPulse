import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { AuthService } from './auth.service.js';
import type { AuthResult, AuthUserDto } from './auth.service.js';
import { googleSchema, loginSchema, registerSchema } from './auth.schemas.js';

interface JwtSignInput {
  sub: string;
  username: string;
  role: AuthUserDto['role'];
  isActive: boolean;
}

function signToken(app: FastifyInstance, user: AuthUserDto): string {
  const payload: JwtSignInput = {
    sub: String(user.id),
    username: user.username,
    role: user.role,
    isActive: true,
  };
  return app.jwt.sign(payload);
}

function authResult(app: FastifyInstance, user: AuthUserDto): AuthResult {
  return { token: signToken(app, user), user };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const authService = new AuthService(app.db);

  const authRateLimit = app.config.isTest
    ? { max: 1000, timeWindow: '1 minute' }
    : { max: 8, timeWindow: '1 minute' };

  app.post(
    '/api/v1/auth/register',
    { config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const body = registerSchema.parse(request.body);
      const user = await authService.register(body);
      return reply.code(201).send({ data: authResult(app, user) });
    },
  );

  app.post('/api/v1/auth/login', { config: { rateLimit: authRateLimit } }, async (request) => {
    const body = loginSchema.parse(request.body);
    const user = await authService.login(body.username, body.password);
    return { data: authResult(app, user) };
  });

  app.post(
    '/api/v1/auth/google',
    { config: { rateLimit: authRateLimit } },
    async (request, reply) => {
      const body = googleSchema.parse(request.body);
      const user = await authService.googleSignIn(body.idToken);
      return reply.code(201).send({ data: authResult(app, user) });
    },
  );

  app.get('/api/v1/auth/providers', async () => ({
    data: {
      google: env.GOOGLE_CLIENT_ID ? { clientId: env.GOOGLE_CLIENT_ID } : null,
    },
  }));

  app.get('/api/v1/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await authService.me(Number(request.user.sub));
    return { data: { user } };
  });
}
