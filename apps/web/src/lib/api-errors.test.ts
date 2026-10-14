import { describe, expect, it } from 'vitest';
import { errorMessageKey, toActionFailure } from './api-errors';

describe('toActionFailure', () => {
  it('keeps the code, requestId and field details of a canonical API error', () => {
    const failure = toActionFailure({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: [{ path: ['headline'], message: 'Too short' }],
      },
      requestId: 'req-1',
    });
    expect(failure).toEqual({
      ok: false,
      code: 'VALIDATION_FAILED',
      requestId: 'req-1',
      details: [{ path: ['headline'], message: 'Too short' }],
    });
  });

  it('falls back to INTERNAL for anything else (network failure, HTML error page)', () => {
    expect(toActionFailure(undefined)).toEqual({ ok: false, code: 'INTERNAL' });
    expect(toActionFailure('<html>502</html>')).toEqual({ ok: false, code: 'INTERNAL' });
    expect(
      toActionFailure({ error: { code: 'NOT_A_CODE', message: 'x' }, requestId: 'r' }),
    ).toEqual({
      ok: false,
      code: 'INTERNAL',
    });
  });
});

describe('errorMessageKey', () => {
  it('maps a code to its translation key', () => {
    expect(errorMessageKey('NOT_FOUND')).toBe('errors.NOT_FOUND');
  });
});
