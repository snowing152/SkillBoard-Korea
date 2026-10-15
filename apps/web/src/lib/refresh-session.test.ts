import { describe, expect, it, vi } from 'vitest';
import { refreshSession } from './refresh-session';

const session = {
  accessToken: 'access',
  expiresInSeconds: 900,
  refreshToken: 'r'.repeat(43),
  refreshExpiresAt: '2026-11-14T00:00:00.000Z',
  user: {
    id: '019a0000-0000-7000-8000-000000000001',
    email: 'anna@example.com',
    displayName: 'Anna',
    roles: ['TALENT'],
    locale: 'en',
    emailVerified: false,
    hasPassword: true,
    pendingConsents: [],
  },
};

describe('refreshSession', () => {
  it('posts the token and returns the parsed session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(session));
    const result = await refreshSession('old-token', fetchMock);

    expect(result).toEqual({ ok: true, session });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/v1\/auth\/refresh$/);
    expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'old-token' });
  });

  it('reports REJECTED for 401 and 400', async () => {
    for (const status of [401, 400]) {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status }));
      expect(await refreshSession('t', fetchMock)).toEqual({ ok: false, reason: 'REJECTED' });
    }
  });

  it('reports UNAVAILABLE for 5xx, 429, network errors and malformed bodies', async () => {
    for (const fetchMock of [
      vi.fn().mockResolvedValue(new Response('{}', { status: 503 })),
      vi.fn().mockResolvedValue(new Response('{}', { status: 429 })),
      vi.fn().mockRejectedValue(new Error('timeout')),
      vi.fn().mockResolvedValue(Response.json({ nope: true })),
    ]) {
      expect(await refreshSession('t', fetchMock)).toEqual({ ok: false, reason: 'UNAVAILABLE' });
    }
  });
});
