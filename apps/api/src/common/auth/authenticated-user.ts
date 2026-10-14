import { UserRoleSchema } from '@skillboard/shared';
import { z } from 'zod';

/**
 * What a verified access token tells us (ADR 0009). Deliberately tiny: anything else (email, profile)
 * is loaded by the service that needs it, so a stale token never serves stale data.
 */
export const AccessTokenPayloadSchema = z.object({
  sub: z.uuid(),
  roles: z.array(UserRoleSchema),
});
export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;

/** Attached to `req.user` by JwtAuthGuard; read with `@CurrentUser()`. */
export type AuthenticatedUser = {
  id: string;
  roles: AccessTokenPayload['roles'];
};
