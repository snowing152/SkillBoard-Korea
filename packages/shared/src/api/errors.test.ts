import { describe, expect, it } from 'vitest';
import { ErrorResponseSchema, errorCodeForStatus } from './errors.js';

describe('errors', () => {
  it('maps known statuses and falls back to INTERNAL', () => {
    expect(errorCodeForStatus(404)).toBe('NOT_FOUND');
    expect(errorCodeForStatus(418)).toBe('INTERNAL');
  });

  it('validates the canonical error shape', () => {
    const ok = ErrorResponseSchema.safeParse({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'x',
        details: [{ path: ['email'], message: 'bad' }],
      },
      requestId: 'r1',
    });
    expect(ok.success).toBe(true);
    expect(
      ErrorResponseSchema.safeParse({ error: { code: 'NOPE', message: 'x' }, requestId: 'r' })
        .success,
    ).toBe(false);
  });
});
