import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { GoogleStartQuerySchema } from '@skillboard/shared';
import type { Request, Response } from 'express';
import type { Env } from '../../common/config/env.js';
import { ApiError } from '../../common/errors/api-error.js';
import { AuthService } from './auth.service.js';
import { OAUTH_NONCE_COOKIE, oauthNonceCookieOptions } from './google-cookie.js';

/**
 * Starts the Google flow: validates the query (guards run before pipes), signs it into `state` and lets
 * Passport redirect to Google. Answers NOT_FOUND while Google is not configured.
 */
@Injectable()
export class GoogleStartGuard extends AuthGuard('google') {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.auth.googleEnabled())
      throw new ApiError('NOT_FOUND', 'Google sign-in is not enabled');
    return (await super.canActivate(context)) as boolean;
  }

  override async getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const query = GoogleStartQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new ApiError(
        'VALIDATION_FAILED',
        'Validation failed',
        query.error.issues.map((i) => ({
          path: i.path.map((p) => (typeof p === 'symbol' ? p.toString() : p)),
          message: i.message,
          code: i.code,
        })),
      );
    }
    const { state, nonce } = await this.auth.signOAuthState(query.data);
    // Set before Passport redirects: the cookie travels with the 302 to Google and comes back on the callback.
    context
      .switchToHttp()
      .getResponse<Response>()
      .cookie(
        OAUTH_NONCE_COOKIE,
        nonce,
        oauthNonceCookieOptions(this.config.get('NODE_ENV', { infer: true }) === 'production'),
      );
    return { session: false, state };
  }
}

/**
 * Finishes the Google flow. A failed or cancelled authentication must end in a redirect with
 * `?error=`, not in a JSON 401 the user would see in the browser, so a Passport failure leaves
 * `req.oauthProfile` empty and the controller decides.
 */
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  constructor(private readonly auth: AuthService) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.auth.googleEnabled())
      throw new ApiError('NOT_FOUND', 'Google sign-in is not enabled');
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      context.switchToHttp().getRequest<Request>().oauthProfile = null;
      return true;
    }
  }

  // `req.user` belongs to the access-token guard; the Google profile goes to its own property.
  override getAuthenticateOptions() {
    return { session: false, property: 'oauthProfile' };
  }
}
