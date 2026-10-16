import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_LOCALE, type Locale, LocaleSchema } from '@skillboard/shared';
import type { Env } from '../../common/config/env.js';
import { ApiError } from '../../common/errors/api-error.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { TokenPurpose } from '../../generated/prisma/enums.js';

/** Lifetime of each one-time token purpose (accounts spec). */
const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
  OAUTH_EXCHANGE: 60 * 1000,
};

const USER_AGENT_MAX = 200;
const OAUTH_SIGNUP_TTL_MS = 10 * 60 * 1000;

/** A Google identity as the callback saw it, parked until the person has chosen a role. */
export type OAuthSignupIdentity = {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  locale: Locale;
};

export type IssuedRefreshToken = { token: string; expiresAt: Date };

/** What `rotate` tells the caller: whose token it was and the new pair's refresh half. */
export type RotatedRefreshToken = IssuedRefreshToken & { userId: string };

/**
 * Everything opaque and random: refresh tokens (ADR 0020) and the one-time tokens of email
 * verification, password reset and the Google exchange code. Only `sha256(token + pepper)` is stored,
 * so a database leak yields nothing that can be presented to the API.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** One place for "now" so unit tests can freeze the clock with `jest.spyOn(Date, 'now')`. */
  private now(): Date {
    return new Date(Date.now());
  }

  private hash(token: string): string {
    const pepper = this.config.get('JWT_REFRESH_PEPPER', { infer: true });
    return createHash('sha256')
      .update(token + pepper)
      .digest('hex');
  }

  private generate(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * The refresh token that replaces `presented`, derived rather than random so that a repeat inside the
   * grace window can be given the same one again (only hashes are stored). Unpredictable without the
   * pepper; the label keeps it apart from the storage hash.
   */
  private successorOf(presented: string): string {
    const pepper = this.config.get('JWT_REFRESH_PEPPER', { infer: true });
    return createHmac('sha256', pepper)
      .update(`refresh-successor:${presented}`)
      .digest('base64url');
  }

  // ---- refresh tokens -------------------------------------------------------------------------

  async issueRefresh(
    userId: string,
    userAgent: string | undefined,
    tx?: Prisma.TransactionClient,
    token: string = this.generate(),
  ): Promise<IssuedRefreshToken> {
    const db = tx ?? this.prisma;
    const ttlDays = this.config.get('REFRESH_TTL_DAYS', { infer: true });
    const expiresAt = new Date(this.now().getTime() + ttlDays * 24 * 60 * 60 * 1000);
    await db.refreshToken.create({
      data: {
        tokenHash: this.hash(token),
        userId,
        userAgent: userAgent?.slice(0, USER_AGENT_MAX) ?? null,
        expiresAt,
      },
    });
    return { token, expiresAt };
  }

  /**
   * Rotation with reuse detection (ADR 0020, amended by ADR 0024). Two timestamps keep the cases apart:
   * `rotatedAt` = exchanged for a newer token, `revokedAt` = ended on purpose (logout, password change
   * or reset, theft response).
   * - unknown, revoked or expired: a plain 401 that touches nothing (a device that sat unused for 30
   *   days, or one signed out by a password change, must not sign the user out elsewhere);
   * - rotated less than the grace window ago: a concurrent refresh (parallel tabs). The same successor
   *   is returned again, never a second one, so a thief who got in inside the window shares the victim's
   *   chain and the next replay of either copy is detected; nothing is revoked;
   * - rotated longer ago: a used token came back, which is replay or theft, so every refresh token of
   *   that user is revoked and the answer is 401;
   * - otherwise: mark this token rotated and issue the next one.
   */
  async rotate(presented: string, userAgent: string | undefined): Promise<RotatedRefreshToken> {
    const tokenHash = this.hash(presented);
    const found = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    if (!found) throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');

    // The user row is locked for the whole decision, as it is in every revoke below, so "revoke all" and
    // a rotation never interleave: either the revoke is first (this token is then revoked and gets a 401)
    // or the rotation is first (and the revoke then sees the new token and ends it too).
    const outcome = await this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, found.userId);
      const row = await tx.refreshToken.findUnique({
        where: { tokenHash },
        select: { id: true, expiresAt: true, rotatedAt: true, revokedAt: true },
      });
      const now = this.now();
      if (!row) return 'invalid' as const;
      if (row.revokedAt !== null || row.expiresAt.getTime() <= now.getTime()) {
        return 'invalid' as const;
      }
      if (row.rotatedAt !== null) {
        const graceMs = this.config.get('REFRESH_GRACE_SECONDS', { infer: true }) * 1000;
        if (now.getTime() - row.rotatedAt.getTime() >= graceMs) {
          await this.revokeAll(found.userId, tx);
          return 'replay' as const; // the revocation must commit, so the 401 is thrown outside
        }
        const token = this.successorOf(presented);
        const successor = await tx.refreshToken.findUnique({
          where: { tokenHash: this.hash(token) },
          select: { expiresAt: true, revokedAt: true },
        });
        const usable =
          successor !== null &&
          successor.revokedAt === null &&
          successor.expiresAt.getTime() > now.getTime();
        // Signed out meanwhile (or rotated before successors were derived): nothing to hand back.
        if (!successor || !usable) return 'invalid' as const;
        return { next: { token, expiresAt: successor.expiresAt } };
      }
      await tx.refreshToken.updateMany({
        where: { id: row.id, rotatedAt: null, revokedAt: null },
        data: { rotatedAt: now },
      });
      const next = await this.issueRefresh(
        found.userId,
        userAgent,
        tx,
        this.successorOf(presented),
      );
      return { next };
    });

    if (outcome === 'invalid' || outcome === 'replay') {
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
    }
    return { ...outcome.next, userId: found.userId };
  }

  /**
   * Row lock on the user: serialises the operations that decide which refresh tokens are alive. */
  private async lockUser(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR NO KEY UPDATE`;
  }

  /**
   * Starts a session for a login or an exchange. Runs under the same user lock as `rotate` and the
   * revokes, and lets the caller re-check that what it verified (the password) is still current, so a
   * password change that commits between the check and this insert cannot be followed by a fresh pair.
   */
  async issueRefreshChecked(
    userId: string,
    userAgent: string | undefined,
    stillValid: (tx: Prisma.TransactionClient) => Promise<boolean>,
  ): Promise<IssuedRefreshToken> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, userId);
      if (!(await stillValid(tx))) {
        throw new ApiError('UNAUTHENTICATED', 'Invalid email or password');
      }
      return this.issueRefresh(userId, userAgent, tx);
    });
  }

  /**
   * Logout of one device, by its refresh token alone: whoever holds the token could use it, so ending it
   * needs no other proof. Unknown tokens are ignored (the caller is signed out either way).
   */
  async revoke(presented: string): Promise<void> {
    const tokenHash = this.hash(presented);
    const found = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    if (!found) return;
    await this.prisma.$transaction(async (tx) => {
      await this.lockUser(tx, found.userId);
      await tx.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: this.now() },
      });
    });
  }

  /** Logout everywhere, password reset, theft response. Takes the user lock itself unless given a `tx`. */
  async revokeAll(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.revokeWhere(userId, undefined, tx);
  }

  /**
   * Password change: every session except the one the caller names (its own refresh token), so the
   * person stays signed in on this device and everyone else is signed out. An unknown or missing token
   * keeps nothing, which is the safe direction.
   */
  async revokeAllExcept(
    userId: string,
    keepToken: string | undefined,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.revokeWhere(userId, keepToken ? this.hash(keepToken) : undefined, tx);
  }

  private async revokeWhere(
    userId: string,
    keepHash: string | undefined,
    tx: Prisma.TransactionClient | undefined,
  ): Promise<void> {
    const run = async (db: Prisma.TransactionClient) => {
      await this.lockUser(db, userId);
      const now = this.now();
      await db.refreshToken.updateMany({
        where: { userId, revokedAt: null, ...(keepHash ? { tokenHash: { not: keepHash } } : {}) },
        data: { revokedAt: now },
      });
      // A Google exchange code issued before this revocation must not mint a session after it.
      await db.verificationToken.updateMany({
        where: { userId, purpose: 'OAUTH_EXCHANGE', usedAt: null },
        data: { usedAt: now },
      });
    };
    if (tx) await run(tx);
    else await this.prisma.$transaction(run);
  }

  // ---- one-time tokens ------------------------------------------------------------------------

  /** Issues a token and retires the user's older unused tokens of the same purpose. */
  async issueOneTime(userId: string, purpose: TokenPurpose): Promise<string> {
    const token = this.generate();
    const now = this.now();
    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.verificationToken.create({
        data: {
          tokenHash: this.hash(token),
          purpose,
          userId,
          expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[purpose]),
        },
      }),
    ]);
    return token;
  }

  /**
   * Spends a one-time token and runs its effect in the same transaction, so the token is used if and
   * only if the effect happened (retries are safe). Unknown, used and expired tokens are one
   * `NOT_FOUND`: the caller cannot tell which, and neither can an attacker.
   */
  async consumeOneTime<T>(
    token: string,
    purpose: TokenPurpose,
    effect: (userId: string, tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const tokenHash = this.hash(token);
    const now = this.now();
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.verificationToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, purpose: true, usedAt: true, expiresAt: true },
      });
      const usable =
        row !== null &&
        row.purpose === purpose &&
        row.usedAt === null &&
        row.expiresAt.getTime() > now.getTime();
      if (!row || !usable) throw new ApiError('NOT_FOUND', 'Token not found or expired');
      // The `usedAt: null` filter decides a race between two requests with the same token.
      const claimed = await tx.verificationToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count === 0) throw new ApiError('NOT_FOUND', 'Token not found or expired');
      return effect(row.userId, tx);
    });
  }

  // ---- Google sign-up step -------------------------------------------------------------------

  /**
   * Parks a Google identity until its owner chooses a role. Returns an opaque token for the URL: the
   * identity itself (email, name) stays in the database and never travels in a link or a log. Expired
   * rows are swept here, so personal data lives at most ten minutes beyond its use.
   */
  async issueOAuthSignup(identity: OAuthSignupIdentity): Promise<string> {
    const token = this.generate();
    const now = this.now();
    await this.prisma.$transaction([
      this.prisma.oAuthSignup.deleteMany({ where: { expiresAt: { lt: now } } }),
      this.prisma.oAuthSignup.create({
        data: {
          tokenHash: this.hash(token),
          provider: 'GOOGLE',
          providerUserId: identity.providerUserId,
          email: identity.email,
          emailVerified: identity.emailVerified,
          displayName: identity.displayName,
          locale: identity.locale,
          expiresAt: new Date(now.getTime() + OAUTH_SIGNUP_TTL_MS),
        },
      }),
    ]);
    return token;
  }

  /**
   * Single use: the row is deleted in the same transaction as `effect` (the account creation), so a
   * failed creation leaves the token usable and a successful one cannot be repeated.
   */
  async consumeOAuthSignup<T>(
    token: string,
    effect: (identity: OAuthSignupIdentity, tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const tokenHash = this.hash(token);
    const now = this.now();
    // Outside the transaction on purpose: it survives the rollback of a failed or expired attempt, so
    // abandoned identities do not outlive their ten minutes (PIPA, ADR 0018).
    await this.prisma.oAuthSignup.deleteMany({ where: { expiresAt: { lt: now } } });
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.oAuthSignup.findUnique({ where: { tokenHash } });
      if (!row) throw new ApiError('NOT_FOUND', 'Token not found or expired');
      if (row.expiresAt.getTime() <= now.getTime()) {
        throw new ApiError('NOT_FOUND', 'Token not found or expired');
      }
      const claimed = await tx.oAuthSignup.deleteMany({ where: { id: row.id } });
      if (claimed.count === 0) throw new ApiError('NOT_FOUND', 'Token not found or expired');
      return effect(
        {
          providerUserId: row.providerUserId,
          email: row.email,
          emailVerified: row.emailVerified,
          displayName: row.displayName,
          locale: toLocale(row.locale),
        },
        tx,
      );
    });
  }
}

function toLocale(value: string): Locale {
  return LocaleSchema.catch(DEFAULT_LOCALE).parse(value);
}
