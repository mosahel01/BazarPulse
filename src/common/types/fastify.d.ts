import type { AppConfig } from '../../config/config.js';
import type { DatabaseHandle } from '../../db/client.js';
import type { UserRole } from '../../db/schema.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      username: string;
      role: UserRole;
      isActive: boolean;
    };
    user: {
      sub: string;
      username: string;
      role: UserRole;
      isActive: boolean;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    db: DatabaseHandle['db'];
    sqlite: DatabaseHandle['sqlite'];
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
