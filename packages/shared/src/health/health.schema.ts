import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  uptimeSeconds: z.number().int().nonnegative(),
  timestamp: z.iso.datetime(),
  checks: z.object({
    database: z.enum(['up', 'down']),
  }),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
