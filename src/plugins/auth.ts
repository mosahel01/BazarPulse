import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../common/errors/app-error.js';
import { env } from '../config/env.js';

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: env.AUTH_SECRET,
    sign: { expiresIn: '7d' },
  });

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.unauthorized('Invalid or expired authentication token.');
    }

    if (!request.user.isActive) {
      throw AppError.unauthorized('This account has been disabled.');
    }
  });
}

export default fp(registerAuth, { name: 'auth-guard' });
