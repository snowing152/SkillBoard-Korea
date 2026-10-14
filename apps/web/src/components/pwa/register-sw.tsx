'use client';

import { useEffect } from 'react';

/** Registers the minimal offline service worker (public/sw.js). Production only, to avoid stale dev caches. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.error('Service worker registration failed', err);
    });
  }, []);
  return null;
}
