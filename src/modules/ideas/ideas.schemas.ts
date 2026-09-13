import { z } from 'zod';
import { ideaDirections } from '../../db/schema.js';

export const createIdeaSchema = z
  .object({
    stockSymbol: z
      .string()
      .trim()
      .min(1, 'A stock symbol is required')
      .max(20)
      .transform((value) => value.toUpperCase()),
    direction: z.enum(ideaDirections, { error: 'Direction must be BULLISH, BEARISH or NEUTRAL' }),
    entryPrice: z.number({ error: 'Entry price is required' }).positive(),
    targetPrice: z.number({ error: 'Target price is required' }).positive(),
    stopLossPrice: z.number({ error: 'Stop-loss price is required' }).positive(),
    thesis: z.string().trim().min(1, 'Thesis is required').max(4_000, 'Thesis must be at most 4000 characters'),
  })
  .strict();

export const ideaIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const ideasQuerySchema = z.object({
  stock: z.string().trim().min(1).max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;