import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole } from '@skillboard/shared';
import type { Request } from 'express';
import { ApiError } from '../errors/api-error.js';
import type { AuthenticatedUser } from './authenticated-user.js';

export const IS_PUBLIC_KEY = 'skillboard:isPublic';
export const ROLES_KEY = 'skillboard:roles';

/** Opt a route (or a whole controller) out of the global JwtAuthGuard. A valid token is still read. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Require one of the given roles on top of a valid token. `@Roles('ADMIN')` for /v1/admin/... */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * The signed-in user. Throws instead of returning undefined so a handler can never silently run
 * without one; on `@Public()` routes, check `req.user` manually if you need optional auth.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const user = ctx.switchToHttp().getRequest<Request>().user;
    if (!user) throw new ApiError('UNAUTHENTICATED', 'Sign in required');
    return user;
  },
);
