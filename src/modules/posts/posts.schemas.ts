import { z } from 'zod';
import { postStatuses } from '../../db/schema.js';

export const createPostSchema = z
  .object({
    stockSymbol: z
      .string()
      .trim()
      .min(1, 'A stock symbol is required')
      .max(20, 'Stock symbol must be at most 20 characters')
      .transform((value) => value.toUpperCase()),
    title: z.string().trim().min(1, 'Title is required').max(120, 'Title must be at most 120 characters'),
    body: z.string().trim().min(1, 'Body is required').max(4_000, 'Body must be at most 4000 characters'),
  })
  .strict();

export const updatePostSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    body: z.string().trim().min(1).max(4_000).optional(),
  })
  .strict()
  .refine((value) => value.title !== undefined || value.body !== undefined, {
    message: 'Provide at least one field to update',
  });

export const createCommentSchema = z
  .object({
    body: z.string().trim().min(1, 'Comment cannot be empty').max(2_000, 'Comment must be at most 2000 characters'),
  })
  .strict();

export const voteSchema = z
  .object({
    value: z.union([z.literal(1), z.literal(-1)], { error: 'Vote value must be 1 or -1' }),
  })
  .strict();

export const postIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const commentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const statusSchema = z.enum(postStatuses);

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type VoteInput = z.infer<typeof voteSchema>;