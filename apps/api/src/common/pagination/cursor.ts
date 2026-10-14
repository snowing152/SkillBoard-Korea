import { z } from 'zod';
import { ApiError } from '../errors/api-error.js';

/**
 * Cursor pagination helpers (ADR 0017). The cursor is the last item's UUID v7 id, base64url-encoded so
 * clients treat it as opaque. Because v7 ids are time-ordered, `id < cursor` with `ORDER BY id DESC`
 * is "everything older than the last item", with no offset and no total count.
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string | undefined): string | undefined {
  if (cursor === undefined) return undefined;
  const id = Buffer.from(cursor, 'base64url').toString('utf8');
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid cursor', [
      { path: ['cursor'], message: 'Use the nextCursor value from the previous page' },
    ]);
  }
  return id;
}
