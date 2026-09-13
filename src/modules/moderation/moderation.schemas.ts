import { z } from 'zod';
import { reportReasons, reportStatuses } from '../../db/schema.js';

export const createReportSchema = z
  .object({
    postId: z.coerce.number().int().positive().optional(),
    commentId: z.coerce.number().int().positive().optional(),
    reason: z.enum(reportReasons),
    description: z.string().trim().max(2_000).optional(),
  })
  .strict()
  .refine((value) => (value.postId !== undefined) !== (value.commentId !== undefined), {
    message: 'Report exactly one target: postId or commentId (not both)',
  });

export const reviewReportSchema = z
  .object({
    status: z.enum(reportStatuses),
  })
  .strict();

export const reportIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const reportsQuerySchema = z.object({
  status: z.enum(reportStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;