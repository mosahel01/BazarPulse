import { z } from 'zod';

export const createWatchlistSchema = z
  .object({
    name: z.string().trim().min(1, 'A name is required').max(60, 'Name must be at most 60 characters'),
  })
  .strict();

export const renameWatchlistSchema = createWatchlistSchema;

export const watchlistIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const addStockSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .min(1, 'A stock symbol is required')
      .max(20)
      .transform((value) => value.toUpperCase()),
  })
  .strict();

export const stockSymbolParamSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((value) => value.toUpperCase()),
});

export type CreateWatchlistInput = z.infer<typeof createWatchlistSchema>;