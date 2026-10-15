import { createCn } from 'cn/config';

/**
 * `cn` that knows our design tokens (src/app/globals.css). Without this, the merger sees
 * `text-label` as a text COLOR and silently drops it when `text-muted-foreground` follows, and it
 * cannot dedupe `rounded-card` against `rounded-lg`. Add a new size/radius/spacing token here too.
 */
export const cn = createCn({
  extend: {
    theme: {
      text: ['caption', 'label', 'body-sm', 'body', 'button', 'title-sm', 'title', 'display'],
      radius: ['tag', 'control', 'card'],
      spacing: ['gutter', 'stack', 'touch', 'cover', 'bottom-nav'],
      container: ['content', 'prose', 'form', 'shell'],
    },
  },
});
