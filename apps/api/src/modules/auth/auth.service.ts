import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  type AuthSession,
  type AuthUser,
  type ChangePassword,
  DEFAULT_LOCALE,
  type GoogleStartQuery,
  type Locale,
  type Login,
  LocaleSchema,
  type Logout,
  type OAuthCallbackError,
  type Register,
  SIGNUP_CONSENT_DOCUMENTS,
  type UpdateMe,
} from '@skillboard/shared';
import { argon2id, hash, verify } from 'argon2';
import type { AccessTokenPayload } from '../../common/auth/authenticated-user.js';
import { type Env, optionalEnv } from '../../common/config/env.js';
import { ApiError } from '../../common/errors/api-error.js';
import { MailPort } from '../../common/mail/mail.port.js';
import { passwordResetMail, verifyEmailMail } from '../../common/mail/templates.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ConsentsService } from '../consents/consents.service.js';
import { type GoogleProfile, type OAuthState, OAuthStateSchema } from './google-profile.js';
import { TokensService } from './tokens.service.js';

/**
 * The columns a session response is built from. `passwordHash` is selected so `hasPassword` can be
 * derived and login can verify it; `toAccount` drops it immediately, so it never travels further.
 */
const userSelect = {
  id: true,
  email: true,
  displayName: true,
  roles: true,
  locale: true,
  emailVerifiedAt: true,
  passwordHash: true,
} satisfies Prisma.UserSelect;
type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

/** A user as the rest of the service sees it: no hash, only what the clients may learn. */
type Account = Omit<AuthUser, 'pendingConsents'>;

/**
 * Hash of an unguessable password, verified when the email is unknown so that login takes the same
 * time whether or not the account exists (no user enumeration through timing).
 */
const DUMMY_HASH_PROMISE = hash('dummy-password-for-constant-time-login', { type: argon2id });

const STATE_TTL = '10m';
const DISPLAY_NAME_MAX = 50;

export type GoogleOutcome = { ok: true; code: string } | { ok: false; error: OAuthCallbackError };

/**
 * Accounts (ADR 0009, 0019, 0020): sign-up, sign-in, refresh, email verification, password reset,
 * Google sign-in and the `/me` settings. Refresh and one-time tokens live in `TokensService`.
 * Logs carry `userId`, the flow and the outcome only; never an email, token, code or state (rule 11).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly consents: ConsentsService,
    private readonly tokens: TokensService,
    private readonly mail: MailPort,
  ) {}

  // ---- sign-up and sign-in --------------------------------------------------------------------

  async register(input: Register, userAgent?: string): Promise<AuthSession> {
    const passwordHash = await hash(input.password, { type: argon2id });
    let row: UserRow;
    try {
      // The user and the consents they gave commit together, or not at all.
      row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email, // already trimmed and lower-cased by RegisterSchema
            passwordHash,
            displayName: input.displayName,
            roles: [input.role],
            locale: input.locale,
          },
          select: userSelect,
        });
        await this.consents.record(created.id, SIGNUP_CONSENT_DOCUMENTS, input.locale, tx);
        return created;
      });
    } catch (err: unknown) {
      // Unique violation on email: a pre-check would race with concurrent sign-ups, so rely on the DB.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ApiError('CONFLICT', 'Email already registered');
      }
      throw err;
    }
    this.logger.log(`register userId=${row.id} outcome=created`);
    await this.sendVerification(row.id, row.email, input.locale);
    return this.session(toAccount(row), userAgent);
  }

  async login(input: Login, userAgent?: string): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: userSelect,
    });
    const ok = user?.passwordHash
      ? await verify(user.passwordHash, input.password)
      : await verify(await DUMMY_HASH_PROMISE, input.password);
    if (!user || !ok) {
      // One message for "no such email", "Google-only account" and "wrong password" (ADR 0018).
      throw new ApiError('UNAUTHENTICATED', 'Invalid email or password');
    }
    return this.session(toAccount(user), userAgent);
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<AuthSession> {
    const rotated = await this.tokens.rotate(refreshToken, userAgent);
    const user = await this.prisma.user.findUnique({
      where: { id: rotated.userId },
      select: userSelect,
    });
    if (!user) throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
    return this.sessionWith(toAccount(user), rotated);
  }

  async logout(userId: string, input: Logout): Promise<void> {
    if (input.all) {
      await this.tokens.revokeAll(userId);
    } else if (input.refreshToken) {
      await this.tokens.revoke(userId, input.refreshToken);
    }
  }

  // ---- email verification and password reset --------------------------------------------------

  /** 204 whether or not the address was already verified; the mail goes out only when it is not. */
  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, locale: true, emailVerifiedAt: true },
    });
    if (!user || user.emailVerifiedAt) return;
    await this.sendVerification(user.id, user.email, toLocale(user.locale));
  }

  async confirmEmail(token: string): Promise<void> {
    const now = new Date(Date.now());
    await this.tokens.consumeOneTime(token, 'EMAIL_VERIFY', async (userId, tx) => {
      await tx.user.updateMany({
        where: { id: userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: now },
      });
      this.logger.log(`verify-email userId=${userId} outcome=confirmed`);
    });
  }

  /** Always resolves the same way: an unknown address is indistinguishable from a known one. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, locale: true },
    });
    if (!user) return;
    const token = await this.tokens.issueOneTime(user.id, 'PASSWORD_RESET');
    const link = `${this.webUrl()}/${toLocale(user.locale)}/reset-password?token=${token}`;
    const mail = passwordResetMail(toLocale(user.locale), link);
    // Not awaited: waiting for the mail provider would make a known address measurably slower.
    void this.deliver(user.id, 'password-reset', { to: user.email, ...mail });
  }

  async confirmPasswordReset(token: string, password: string): Promise<void> {
    const passwordHash = await hash(password, { type: argon2id });
    await this.tokens.consumeOneTime(token, 'PASSWORD_RESET', async (userId, tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      // Whoever knew the old password must not stay signed in.
      await this.tokens.revokeAll(userId, tx);
      this.logger.log(`password-reset userId=${userId} outcome=changed`);
    });
  }

  // ---- Google ---------------------------------------------------------------------------------

  googleEnabled(): boolean {
    return (['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'] as const).every(
      (key) => optionalEnv(this.config, key) !== undefined,
    );
  }

  /** Signs the sign-up choices into the `state` parameter that Google echoes back. */
  signOAuthState(query: GoogleStartQuery): Promise<string> {
    const payload: OAuthState = {
      purpose: 'oauth_state',
      role: query.role,
      locale: query.locale,
      ...(query.next ? { next: query.next } : {}),
      nonce: randomBytes(16).toString('base64url'),
    };
    return this.jwt.signAsync(payload, { expiresIn: STATE_TTL });
  }

  /** Returns null for anything that is not a fresh, well-formed state of ours. */
  async verifyOAuthState(state: string | undefined): Promise<OAuthState | null> {
    if (!state) return null;
    try {
      const parsed = OAuthStateSchema.safeParse(await this.jwt.verifyAsync(state));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /**
   * The three outcomes of ADR 0009: a known Google identity signs in; a verified account with the same
   * email gets the identity linked; an unverified one is refused (takeover prevention); otherwise a
   * new account is created. A single-use 60 s code is returned, never a token (the code travels in a URL).
   */
  async completeGoogle(profile: GoogleProfile, state: OAuthState): Promise<GoogleOutcome> {
    const email = profile.email?.trim().toLowerCase();
    if (!email) return { ok: false, error: 'OAUTH_FAILED' };

    const identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUserId: { provider: 'GOOGLE', providerUserId: profile.id } },
      select: { userId: true },
    });

    let userId: string;
    let outcome: 'existing' | 'linked' | 'created';
    if (identity) {
      userId = identity.userId;
      outcome = 'existing';
    } else {
      const sameEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, emailVerifiedAt: true },
      });
      if (sameEmail) {
        // Both sides must vouch for the address: our account verified it, and Google says it did too.
        if (!sameEmail.emailVerifiedAt || !profile.emailVerified) {
          this.logger.warn(`google userId=${sameEmail.id} outcome=email_not_verified`);
          return { ok: false, error: 'EMAIL_NOT_VERIFIED' };
        }
        await this.prisma.authIdentity.create({
          data: { provider: 'GOOGLE', providerUserId: profile.id, userId: sameEmail.id },
        });
        userId = sameEmail.id;
        outcome = 'linked';
      } else {
        try {
          userId = await this.createGoogleUser(profile, email, state);
        } catch (err: unknown) {
          // A concurrent sign-up with the same email won the unique index; ask the user to retry.
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return { ok: false, error: 'OAUTH_FAILED' };
          }
          throw err;
        }
        outcome = 'created';
      }
    }

    this.logger.log(`google userId=${userId} outcome=${outcome}`);
    return { ok: true, code: await this.tokens.issueOneTime(userId, 'OAUTH_EXCHANGE') };
  }

  private async createGoogleUser(
    profile: GoogleProfile,
    email: string,
    state: OAuthState,
  ): Promise<string> {
    const fallbackName = email.split('@')[0] ?? 'User';
    const given = profile.displayName?.trim() ?? '';
    const displayName = (given.length > 0 ? given : fallbackName)
      .padEnd(2, '_')
      .slice(0, DISPLAY_NAME_MAX);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          displayName,
          roles: [state.role],
          locale: state.locale,
          passwordHash: null,
          emailVerifiedAt: profile.emailVerified ? new Date(Date.now()) : null,
          identities: { create: { provider: 'GOOGLE', providerUserId: profile.id } },
        },
        select: { id: true },
      });
      await this.consents.record(created.id, SIGNUP_CONSENT_DOCUMENTS, state.locale, tx);
      return created.id;
    });
  }

  /** Spends the callback's one-time code and starts the session, exactly like a login. */
  async exchange(code: string, userAgent?: string): Promise<AuthSession> {
    const userId = await this.tokens.consumeOneTime(code, 'OAUTH_EXCHANGE', (id) =>
      Promise.resolve(id),
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw new ApiError('NOT_FOUND', 'Token not found or expired');
    return this.session(toAccount(user), userAgent);
  }

  // ---- the signed-in user ---------------------------------------------------------------------

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
    return this.toAuthUser(toAccount(user));
  }

  async updateMe(userId: string, input: UpdateMe): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
      },
      select: userSelect,
    });
    return this.toAuthUser(toAccount(user));
  }

  async changePassword(userId: string, input: ChangePassword): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
    if (!user.passwordHash) {
      throw new ApiError('FORBIDDEN', 'No password is set', undefined, 'NO_PASSWORD_SET');
    }
    if (!(await verify(user.passwordHash, input.currentPassword))) {
      throw new ApiError('FORBIDDEN', 'Current password is wrong', undefined, 'WRONG_PASSWORD');
    }
    const passwordHash = await hash(input.newPassword, { type: argon2id });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    this.logger.log(`change-password userId=${userId} outcome=changed`);
  }

  // ---- helpers --------------------------------------------------------------------------------

  /** Where the Google callback sends the browser: the web app's `/<locale>/auth/callback` route. */
  oauthRedirectUrl(locale: Locale, params: Record<string, string>): string {
    return `${this.webUrl()}/${locale}/auth/callback?${new URLSearchParams(params).toString()}`;
  }

  private webUrl(): string {
    return this.config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
  }

  /** Issues a verification token and mails the link; a mail failure never fails the request. */
  private async sendVerification(userId: string, email: string, locale: Locale): Promise<void> {
    const token = await this.tokens.issueOneTime(userId, 'EMAIL_VERIFY');
    const link = `${this.webUrl()}/${locale}/verify-email?token=${token}`;
    await this.deliver(userId, 'verify-email', { to: email, ...verifyEmailMail(locale, link) });
  }

  private async deliver(
    userId: string,
    flow: 'verify-email' | 'password-reset',
    message: Parameters<MailPort['send']>[0],
  ): Promise<void> {
    try {
      await this.mail.send(message);
      this.logger.log(`${flow} userId=${userId} outcome=mail_sent`);
    } catch {
      // The user can ask for another mail; the address and the error text stay out of the log.
      this.logger.warn(`${flow} userId=${userId} outcome=mail_failed`);
    }
  }

  private async toAuthUser(account: Account): Promise<AuthUser> {
    return {
      ...account,
      // Documents to accept before the account can be used; the web redirects to /consent (legal spec).
      pendingConsents: await this.consents.pendingFor(account.id),
    };
  }

  private async session(account: Account, userAgent?: string): Promise<AuthSession> {
    const refresh = await this.tokens.issueRefresh(account.id, userAgent);
    return this.sessionWith(account, refresh);
  }

  private async sessionWith(
    account: Account,
    refresh: { token: string; expiresAt: Date },
  ): Promise<AuthSession> {
    const payload: AccessTokenPayload = { sub: account.id, roles: account.roles };
    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresInSeconds: this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt.toISOString(),
      user: await this.toAuthUser(account),
    };
  }
}

function toLocale(value: string): Locale {
  // `locale` is a plain column; fall back rather than fail if a row predates a removed locale.
  return LocaleSchema.catch(DEFAULT_LOCALE).parse(value);
}

function toAccount(row: UserRow): Account {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    roles: row.roles,
    locale: toLocale(row.locale),
    emailVerified: row.emailVerifiedAt !== null,
    hasPassword: row.passwordHash !== null,
  };
}
