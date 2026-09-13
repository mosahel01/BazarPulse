import type { FastifyInstance, FastifyRequest } from 'fastify';
import { paginationMeta } from '../../common/http/pagination.js';
import { PostRepository } from '../posts/posts.repository.js';
import {
  createReportSchema,
  reportIdParamSchema,
  reportsQuerySchema,
  reviewReportSchema,
} from './moderation.schemas.js';
import { ModerationRepository } from './moderation.repository.js';
import { assertModerator, ModerationService } from './moderation.service.js';

function userId(request: FastifyRequest): number {
  return Number(request.user.sub);
}

export async function registerModerationRoutes(app: FastifyInstance): Promise<void> {
  const service = new ModerationService(new ModerationRepository(app.db), new PostRepository(app.db));

  app.post(
    '/api/v1/reports',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const input = createReportSchema.parse(request.body);
      const report = await service.createReport(userId(request), {
        ...(input.postId !== undefined ? { postId: input.postId } : {}),
        ...(input.commentId !== undefined ? { commentId: input.commentId } : {}),
        reason: input.reason,
        ...(input.description !== undefined ? { description: input.description } : {}),
      });
      return reply.code(201).send({ data: report });
    },
  );

  app.get(
    '/api/v1/moderation/reports',
    { preHandler: [app.authenticate] },
    async (request) => {
      assertModerator(request.user.role);
      const query = reportsQuerySchema.parse(request.query);
      const { rows, total } = await service.listReports({
        ...(query.status !== undefined ? { status: query.status } : {}),
        page: query.page,
        pageSize: query.pageSize,
      });
      return { data: rows, meta: paginationMeta(total, query.page, query.pageSize) };
    },
  );

  app.patch(
    '/api/v1/moderation/reports/:id',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { id } = reportIdParamSchema.parse(request.params);
      const { status } = reviewReportSchema.parse(request.body);
      const report = await service.reviewReport(userId(request), request.user.role, id, status);
      return { data: report };
    },
  );

  app.post(
    '/api/v1/moderation/posts/:id/hide',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = reportIdParamSchema.parse(request.params);
      await service.hidePost(request.user.role, id);
      return reply.code(204).send();
    },
  );

  app.post(
    '/api/v1/moderation/posts/:id/restore',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = reportIdParamSchema.parse(request.params);
      await service.restorePost(request.user.role, id);
      return reply.code(204).send();
    },
  );
}