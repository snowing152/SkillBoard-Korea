import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { PATH_HEADER } from './lib/path';
import { proxy } from './proxy';

describe('proxy path header', () => {
  it('overwrites a client-sent value with the real path and query', () => {
    const request = new NextRequest('http://localhost/ko/me/account?x=1', {
      headers: { [PATH_HEADER]: '//evil.com' },
    });
    proxy(request);
    expect(request.headers.get(PATH_HEADER)).toBe('/ko/me/account?x=1');
  });

  it('sets the header when the client sent none', () => {
    const request = new NextRequest('http://localhost/me/talent-profile');
    proxy(request);
    expect(request.headers.get(PATH_HEADER)).toBe('/me/talent-profile');
  });

  it('forwards the real path, not the spoofed one, to Server Components', () => {
    const request = new NextRequest('http://localhost/me/account', {
      headers: { [PATH_HEADER]: 'https://evil.com' },
    });
    const response = proxy(request);
    // Next lists forwarded request headers on the response as x-middleware-request-<name>.
    expect(response.headers.get(`x-middleware-request-${PATH_HEADER}`)).toBe('/me/account');
  });
});
