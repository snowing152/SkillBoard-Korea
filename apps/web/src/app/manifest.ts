import { APP_NAME, APP_SLUG } from '@skillboard/shared';
import type { MetadataRoute } from 'next';

// Installable PWA (ADR 0003). Next serves this at /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: APP_SLUG,
    name: APP_NAME,
    short_name: 'SkillBoard',
    description: 'Talent marketplace for foreigners in Korea',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
