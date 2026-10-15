import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PATH_HEADER } from './lib/path';
import { proxy } from './proxy';
import { REFRESH_COOKIE, SESSION_COOKIE } from './lib/session-cookies';

describe('proxy path header', () => {
  it('overwrites a client-sent value with the real path and query', async () => {
    const request = new NextRequest('http://localhost/ko/me/account?x=1', {
      headers: { [PATH_HEADER]: '//evil.com' },
    });
    await proxy(request);
    expect(request.headers.get(PATH_HEADER)).toBe('/ko/me/account?x=1');
  });

  it('sets the header when the client sent none', async () => {
    const request = new NextRequest('http://localhost/me/talent-profile');
    await proxy(request);
    expect(request.headers.get(PATH_HEADER)).toBe('/me/talent-profile');
  });

  it('forwards the real path, not the spoofed one, to Server Components', async () => {
    const request = new NextRequest('http://localhost/me/account', {
      headers: { [PATH_HEADER]: 'https://evil.com' },
    });
    const response = await proxy(request);
    // Next lists forwarded request headers on the response as x-middleware-request-<name>.
    expect(response.headers.get(`x-middleware-request-${PATH_HEADER}`)).toBe('/me/account');
  });
});

describe('proxy silent refresh (ADR 0020)', () => {
  const session = {
    accessToken: 'new-access-token',
    expiresInSeconds: 900,
    refreshToken: 'n'.repeat(43),
    refreshExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    user: {
      id: '019a0000-0000-7000-8000-000000000001',
      email: 'anna@example.com',
      displayName: 'Anna',
      roles: ['TALENT'],
      locale: 'en',
      emailVerified: true,
      hasPassword: true,
      pendingConsents: [],
    },
  };
  const withRefreshCookie = (path: string, cookie = `${REFRESH_COOKIE}=old-refresh-token`) =>
    new NextRequest(`http://localhost${path}`, { headers: { cookie } });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renews both cookies and forwards the new access token to the render', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(session));
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxy(withRefreshCookie('/me/talent-profile'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe('new-access-token');
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe('n'.repeat(43));
    // The Server Components of this very request must already see the new token.
    expect(response.headers.get('x-middleware-request-cookie')).toContain(
      `${SESSION_COOKIE}=new-access-token`,
    );
  });

  it('clears the refresh cookie when the API rejects it, and continues signed out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    const response = await proxy(withRefreshCookie('/me/account'));

    const cleared = response.cookies.get(REFRESH_COOKIE);
    expect(cleared?.value).toBe('');
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it('keeps the refresh cookie when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const response = await proxy(withRefreshCookie('/me/account'));

    expect(response.cookies.get(REFRESH_COOKIE)).toBeUndefined();
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it('does nothing while an access cookie exists, or without a refresh cookie', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await proxy(
      withRefreshCookie('/me/account', `${SESSION_COOKIE}=access; ${REFRESH_COOKIE}=refresh`),
    );
    await proxy(new NextRequest('http://localhost/me/account'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves the Google callback path untouched in every locale', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await proxy(withRefreshCookie('/auth/callback?code=abc'));
    await proxy(withRefreshCookie('/ko/auth/callback?code=abc'));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
