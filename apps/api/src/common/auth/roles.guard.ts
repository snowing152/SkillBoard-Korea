import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@skillboard/shared';
import type { Request } from 'express';
import { ApiError } from '../errors/api-error.js';
import { ROLES_KEY } from './decorators.js';

/** Runs after JwtAuthGuard. Without `@Roles()` metadata it does nothing. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest<Request>().user;
    if (!user) throw new ApiError('UNAUTHENTICATED', 'Sign in required');
    if (!required.some((role) => user.roles.includes(role))) {
      throw new ApiError('FORBIDDEN', 'Insufficient role');
    }
    return true;
  }
}
