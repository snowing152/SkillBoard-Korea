import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PaginationQuerySchema, paginatedSchema } from './pagination.js';

describe('PaginationQuerySchema', () => {
  it('applies the default limit and coerces strings from query params', () => {
    expect(PaginationQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(PaginationQuerySchema.parse({ limit: '5', cursor: 'abc' })).toEqual({
      limit: 5,
      cursor: 'abc',
    });
  });

  it('rejects limits outside 1..50', () => {
    expect(PaginationQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(PaginationQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
  });
});

describe('paginatedSchema', () => {
  it('wraps an item schema with items + nextCursor', () => {
    const schema = paginatedSchema(z.object({ id: z.string() }));
    expect(schema.parse({ items: [{ id: '1' }], nextCursor: null })).toEqual({
      items: [{ id: '1' }],
      nextCursor: null,
    });
  });
});
