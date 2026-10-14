import { z } from 'zod';

/** Every user-supplied link: http(s) with a real hostname, capped length (ADR 0018). */
export const HttpUrlSchema = z
  .url({ protocol: /^https?$/, hostname: z.regexes.domain })
  .max(2048)
  .meta({ description: 'http or https URL' });
