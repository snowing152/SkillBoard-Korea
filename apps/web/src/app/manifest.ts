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
    // Manifest colors cannot read CSS variables: keep in sync with --background and --primary in globals.css.
    background_color: '#f4f5f3',
    theme_color: '#0e6b5c',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
