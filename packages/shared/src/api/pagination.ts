import { z } from 'zod';

/** Cursor pagination for every list endpoint (ADR 0017). No `total`: mobile infinite scroll does not need it. */
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 50;

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAGINATION_MAX_LIMIT).default(PAGINATION_DEFAULT_LIMIT),
  cursor: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .meta({ description: 'Opaque; take it from nextCursor' }),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}
export type Paginated<T> = { items: T[]; nextCursor: string | null };
