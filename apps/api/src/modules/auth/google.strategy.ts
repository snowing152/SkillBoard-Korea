import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-google-oauth20';
import { type Env, optionalEnv } from '../../common/config/env.js';
import type { GoogleProfile } from './google-profile.js';

/**
 * Passport strategy for Google (scopes `email profile`). The constructor throws without a client id,
 * so when Google is not configured it gets placeholders; the guards answer `NOT_FOUND` before the
 * strategy can ever run (`AuthService.googleEnabled`). No session: the account logic lives in
 * `AuthService.completeGoogle`, this class only translates Google's profile.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<Env, true>) {
    super({
      clientID: optionalEnv(config, 'GOOGLE_CLIENT_ID') ?? 'google-not-configured',
      clientSecret: optionalEnv(config, 'GOOGLE_CLIENT_SECRET') ?? 'google-not-configured',
      callbackURL: optionalEnv(config, 'GOOGLE_CALLBACK_URL') ?? 'http://localhost/google-disabled',
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleProfile {
    const primary = profile.emails?.[0];
    // The userinfo endpoint reports `email_verified`; the typings do not list it on `emails`.
    const verified: unknown = (primary as { verified?: unknown } | undefined)?.verified;
    return {
      id: profile.id,
      email: primary?.value ?? null,
      emailVerified: verified === true || verified === 'true',
      displayName: profile.displayName || null,
    };
  }
}
