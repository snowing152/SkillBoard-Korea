// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('/auth/callback', () => {
  it('gives up on a hanging code exchange and lands on sign-in instead of waiting forever', async () => {
    // A cold or stuck API must not hold the browser's request open: the exchange has a deadline.
    const timeout = vi
      .spyOn(AbortSignal, 'timeout')
      .mockImplementation(() => AbortSignal.abort(new DOMException('timed out', 'TimeoutError')));
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal;
            if (signal?.aborted) reject(signal.reason as Error);
            signal?.addEventListener('abort', () => {
              reject(signal.reason as Error);
            });
          }),
      ),
    );
    const request = new NextRequest(
      `http://localhost:3000/auth/callback?code=${'c'.repeat(43)}&n=nonce-1`,
      { headers: { cookie: 'skillboard_google_nonce=nonce-1' } },
    );

    const response = await GET(request, { params: Promise.resolve({ locale: 'en' }) });

    expect(timeout).toHaveBeenCalledWith(5000);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/sign-in?error=OAUTH_FAILED',
    );
  }, 2000);
});
