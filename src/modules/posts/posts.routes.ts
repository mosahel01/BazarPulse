import type { FastifyInstance, FastifyRequest } from 'fastify';
import { PostsService } from './posts.service.js';
import {
  createCommentSchema,
  createPostSchema,
  postIdParamSchema,
  updatePostSchema,
  voteSchema,
} from './posts.schemas.js';

function userId(request: FastifyRequest): number {
  return Number(request.user.sub);
}

export async function registerPostRoutes(app: FastifyInstance): Promise<void> {
  const postsService = new PostsService(app.db);

  app.post(
    '/api/v1/posts',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const input = createPostSchema.parse(request.body);
      const post = await postsService.createPost(userId(request), input);
      return reply.code(201).send({ data: post });
    },
  );

  app.get('/api/v1/posts/:id', async (request) => {
    const { id } = postIdParamSchema.parse(request.params);
    const post = await postsService.getPost(id, currentUserId(request));
    return { data: post };
  });

  app.patch(
    '/api/v1/posts/:id',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { id } = postIdParamSchema.parse(request.params);
      const patch = updatePostSchema.parse(request.body);
      const post = await postsService.updatePost(
        userId(request),
        request.user.role,
        id,
        patch,
      );
      return { data: post };
    },
  );

  app.delete(
    '/api/v1/posts/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = postIdParamSchema.parse(request.params);
      await postsService.deletePost(userId(request), request.user.role, id);
      return reply.code(204).send();
    },
  );

  app.get('/api/v1/posts/:id/comments', async (request) => {
    const { id } = postIdParamSchema.parse(request.params);
    const comments = await postsService.listComments(id);
    return { data: comments };
  });

  app.post(
    '/api/v1/posts/:id/comments',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = postIdParamSchema.parse(request.params);
      const input = createCommentSchema.parse(request.body);
      const comment = await postsService.addComment(userId(request), id, input);
      return reply.code(201).send({ data: comment });
    },
  );

  app.put(
    '/api/v1/posts/:id/vote',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { id } = postIdParamSchema.parse(request.params);
      const { value } = voteSchema.parse(request.body);
      const vote = await postsService.vote(userId(request), id, value);
      return { data: vote };
    },
  );

  app.delete(
    '/api/v1/posts/:id/vote',
    { preHandler: [app.authenticate] },
    async (request) => {
      const { id } = postIdParamSchema.parse(request.params);
      const vote = await postsService.removeVote(userId(request), id);
      return { data: vote };
    },
  );
}

function currentUserId(request: FastifyRequest): number | undefined {
  try {
    if (request.user?.sub) {
      return Number(request.user.sub);
    }
  } catch {
    return undefined;
  }
  return undefined;
}