import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  // ---- refresh tokens -------------------------------------------------------------------------

  async issueRefresh(
    userId: string,
    userAgent: string | undefined,
    tx?: Prisma.TransactionClient,
  ): Promise<IssuedRefreshToken> {
    const db = tx ?? this.prisma;
    const token = this.generate();
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
   * - rotated less than the grace window ago: a concurrent refresh (parallel tabs). A fresh pair is
   *   issued and nothing else is revoked;
   * - rotated longer ago: a used token came back, which is replay or theft, so every refresh token of
   *   that user is revoked and the answer is 401;
   * - otherwise: mark this token rotated and issue the next one.
   */
  async rotate(presented: string, userAgent: string | undefined): Promise<RotatedRefreshToken> {
    const tokenHash = this.hash(presented);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, rotatedAt: true, revokedAt: true },
    });
    const now = this.now();
    if (!row) throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
    if (row.revokedAt !== null || row.expiresAt.getTime() <= now.getTime()) {
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
    }

    if (row.rotatedAt !== null) {
      const graceMs = this.config.get('REFRESH_GRACE_SECONDS', { infer: true }) * 1000;
      if (now.getTime() - row.rotatedAt.getTime() >= graceMs) {
        await this.revokeAll(row.userId);
        throw new ApiError('UNAUTHENTICATED', 'Invalid or expired token');
      }
    } else {
      // `rotatedAt: null` in the filter makes two simultaneous rotations safe: the loser updates zero
      // rows and is handled like a concurrent refresh, which is what it is.
      await this.prisma.refreshToken.updateMany({
        where: { id: row.id, rotatedAt: null, revokedAt: null },
        data: { rotatedAt: now },
      });
    }
    const next = await this.issueRefresh(row.userId, userAgent);
    return { ...next, userId: row.userId };
  }

  /**
   * Logout of one device. Unknown tokens are ignored (the caller is signed out either way), and a token
   * of another user is never touched: the `userId` filter comes from the access token, not the body.
   */
  async revoke(userId: string, presented: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash: this.hash(presented), revokedAt: null },
      data: { revokedAt: this.now() },
    });
  }

  /** Logout everywhere, password reset, theft response. */
  async revokeAll(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx ?? this.prisma;
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: this.now() },
    });
  }

  /**
   * Password change: every session except the one the caller names (its own refresh token), so the
   * person stays signed in on this device and everyone else is signed out. An unknown or missing token
   * keeps nothing, which is the safe direction.
   */
  async revokeAllExcept(userId: string, keepToken: string | undefined): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepToken ? { tokenHash: { not: this.hash(keepToken) } } : {}),
      },
      data: { revokedAt: this.now() },
    });
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
}
