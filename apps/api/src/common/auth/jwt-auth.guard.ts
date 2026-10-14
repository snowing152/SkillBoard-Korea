import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ApiError } from '../errors/api-error.js';
import { AccessTokenPayloadSchema } from './authenticated-user.js';
import { IS_PUBLIC_KEY } from './decorators.js';

/**
 * Global guard (registered as APP_GUARD in app.module.ts, ADR 0009 / 0019): every route needs a valid
 * `Authorization: Bearer <jwt>` unless it is marked `@Public()`. Public routes still get `req.user`
 * when a valid token is present, which the search and contact specs use for "optional auth".
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? false;
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = bearerToken(req);

    if (!token) {
      if (isPublic) return true;
      throw new ApiError('UNAUTHENTICATED', 'Sign in required');
    }
    try {
      const payload = AccessTokenPayloadSchema.parse(await this.jwt.verifyAsync(token));
      req.user = { id: payload.sub, roles: payload.roles };
      return true;
    } catch {
      if (isPublic) return true;
      // One message for expired, malformed and badly signed tokens: the client reaction is the same.
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
    }
  }
}

function bearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
