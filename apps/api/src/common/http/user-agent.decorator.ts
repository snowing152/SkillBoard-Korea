import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The caller's `User-Agent`, for labelling a refresh token's device. A custom decorator on purpose:
 * `@Headers('user-agent')` would put a required header parameter into the OpenAPI document, and every
 * generated client would then have to send it.
 */
export const UserAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<Request>().header('user-agent'),
);
