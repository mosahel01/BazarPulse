import type { FastifyInstance } from 'fastify';
import { paginationMeta } from '../../common/http/pagination.js';
import { IdeasService } from './ideas.service.js';
import { createIdeaSchema, ideaIdParamSchema, ideasQuerySchema } from './ideas.schemas.js';

export async function registerIdeaRoutes(app: FastifyInstance): Promise<void> {
  const service = new IdeasService(app.db);

  app.get('/api/v1/ideas', async (request) => {
    const query = ideasQuerySchema.parse(request.query);
    const { rows, total } = await service.list({
      stock: query.stock,
      page: query.page,
      pageSize: query.pageSize,
    });
    return { data: rows, meta: paginationMeta(total, query.page, query.pageSize) };
  });

  app.get('/api/v1/ideas/:id', async (request) => {
    const { id } = ideaIdParamSchema.parse(request.params);
    return { data: await service.get(id) };
  });

  app.post(
    '/api/v1/ideas',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const input = createIdeaSchema.parse(request.body);
      const idea = await service.create(Number(request.user.sub), input);
      return reply.code(201).send({ data: idea });
    },
  );
}