import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type Pagination = {
  page: number;
  pageSize: number;
};

export function parsePagination(
  query: unknown,
): { page: number; pageSize: number } {
  return paginationSchema.parse(query);
}

export function paginationMeta(total: number, page: number, pageSize: number) {
  const pages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return { page, pageSize, total, pages };
}

export function parsePageParams(
  query: unknown,
): { page: number; pageSize: number; offset: number } {
  const { page, pageSize } = parsePagination(query);
  return { page, pageSize, offset: (page - 1) * pageSize };
}