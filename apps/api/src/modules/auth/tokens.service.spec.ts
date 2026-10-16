import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { TEST_TOKEN_PEPPER } from '../../../test/fixtures/credentials.js';
import { firstCallArg } from '../../../test/helpers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { TokensService } from './tokens.service.js';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const PEPPER = TEST_TOKEN_PEPPER;
const GRACE_SECONDS = 30;
const NOW = new Date('2026-10-15T12:00:00.000Z');

const env: Record<string, unknown> = {
  JWT_REFRESH_PEPPER: PEPPER,
  REFRESH_TTL_DAYS: 30,
  REFRESH_GRACE_SECONDS: GRACE_SECONDS,
};

const secondsAgo = (s: number) => new Date(NOW.getTime() - s * 1000);
const secondsAhead = (s: number) => new Date(NOW.getTime() + s * 1000);
const sha = (token: string) =>
  createHash('sha256')
    .update(token + PEPPER)
    .digest('hex');

describe('TokensService', () => {
  const prisma = {
    refreshToken: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    verificationToken: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    oAuthSignup: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  let service: TokensService;

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as unknown[]),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
      ],
    }).compile();
    service = moduleRef.get(TokensService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('refresh tokens', () => {
    it('stores only the peppered sha256 and truncates the user agent', async () => {
      const issued = await service.issueRefresh(USER_ID, 'x'.repeat(500));
      const { data } = firstCallArg(prisma.refreshToken.create) as {
        data: { tokenHash: string; userAgent: string; expiresAt: Date; userId: string };
      };
      expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(data.tokenHash).toBe(sha(issued.token));
      expect(JSON.stringify(data)).not.toContain(issued.token);
      expect(data.userAgent).toHaveLength(200);
      expect(data.expiresAt).toEqual(new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000));
      expect(issued.expiresAt).toEqual(data.expiresAt);
    });

    it('rotates a live token: marks it rotated and issues the next one', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAhead(1000),
        rotatedAt: null,
        revokedAt: null,
      });
      const rotated = await service.rotate('presented-token', 'ua');

      expect(firstCallArg(prisma.refreshToken.findUnique)).toMatchObject({
        where: { tokenHash: sha('presented-token') },
      });
      expect(firstCallArg(prisma.refreshToken.updateMany)).toEqual({
        where: { id: 'row-1', rotatedAt: null, revokedAt: null },
        data: { rotatedAt: NOW },
      });
      expect(rotated.userId).toBe(USER_ID);
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('treats a token rotated 5 s ago as a concurrent refresh: new pair, nothing revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAhead(1000),
        rotatedAt: secondsAgo(5),
        revokedAt: null,
      });
      const rotated = await service.rotate('presented-token', undefined);

      expect(rotated.userId).toBe(USER_ID);
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('treats a token rotated longer ago than the grace as theft: 401 and all tokens revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAhead(1000),
        rotatedAt: secondsAgo(GRACE_SECONDS + 1),
        revokedAt: null,
      });
      await expect(service.rotate('presented-token', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(firstCallArg(prisma.refreshToken.updateMany)).toEqual({
        where: { userId: USER_ID, revokedAt: null },
        data: { revokedAt: NOW },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('answers a plain 401 for an expired token and revokes nothing', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAgo(1),
        rotatedAt: null,
        revokedAt: null,
      });
      await expect(service.rotate('presented-token', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('an expired token that was also rotated long ago is just expired: still revokes nothing', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAgo(1),
        rotatedAt: secondsAgo(GRACE_SECONDS + 5),
        revokedAt: null,
      });
      await expect(service.rotate('presented-token', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('a token revoked on purpose is a plain 401, even if it was rotated seconds ago', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAhead(1000),
        rotatedAt: secondsAgo(3),
        revokedAt: secondsAgo(1),
      });
      await expect(service.rotate('presented-token', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      // Nothing is minted after a password reset or "log out everywhere", and nothing else is revoked.
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('answers 401 for an unknown token without revoking anything', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.rotate('unknown', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('revokeAll stamps every live token of the user', async () => {
      await service.revokeAll(USER_ID);
      expect(firstCallArg(prisma.refreshToken.updateMany)).toEqual({
        where: { userId: USER_ID, revokedAt: null },
        data: { revokedAt: NOW },
      });
    });

    it('logout of one token only touches that user’s row', async () => {
      await service.revoke(USER_ID, 'presented-token');
      expect(firstCallArg(prisma.refreshToken.updateMany)).toMatchObject({
        where: { userId: USER_ID, tokenHash: sha('presented-token'), revokedAt: null },
      });
    });

    it('revokeAllExcept spares the named token and reaches the rest', async () => {
      await service.revokeAllExcept(USER_ID, 'keep-this-one');
      expect(firstCallArg(prisma.refreshToken.updateMany)).toEqual({
        where: { userId: USER_ID, revokedAt: null, tokenHash: { not: sha('keep-this-one') } },
        data: { revokedAt: NOW },
      });
    });

    it('revokeAllExcept without a token keeps nothing', async () => {
      await service.revokeAllExcept(USER_ID, undefined);
      const arg = firstCallArg(prisma.refreshToken.updateMany) as { where: object };
      expect(arg.where).not.toHaveProperty('tokenHash');
    });
  });

  describe('one-time tokens', () => {
    it('issues a token with the purpose TTL and retires older unused ones', async () => {
      const token = await service.issueOneTime(USER_ID, 'PASSWORD_RESET');

      expect(firstCallArg(prisma.verificationToken.updateMany)).toEqual({
        where: { userId: USER_ID, purpose: 'PASSWORD_RESET', usedAt: null },
        data: { usedAt: NOW },
      });
      const { data } = firstCallArg(prisma.verificationToken.create) as {
        data: { tokenHash: string; expiresAt: Date; purpose: string };
      };
      expect(data.tokenHash).toBe(sha(token));
      expect(data.expiresAt).toEqual(secondsAhead(60 * 60));
    });

    it('uses 24 h for email verification and 60 s for the Google exchange code', async () => {
      await service.issueOneTime(USER_ID, 'EMAIL_VERIFY');
      await service.issueOneTime(USER_ID, 'OAUTH_EXCHANGE');
      const [verify, exchange] = prisma.verificationToken.create.mock.calls.map(
        (call) => (call as [{ data: { expiresAt: Date } }])[0].data.expiresAt,
      );
      expect(verify).toEqual(secondsAhead(24 * 60 * 60));
      expect(exchange).toEqual(secondsAhead(60));
    });

    const live = {
      id: 'v-1',
      userId: USER_ID,
      purpose: 'EMAIL_VERIFY',
      usedAt: null,
      expiresAt: secondsAhead(100),
    };

    it('spends a valid token and runs the effect in the same transaction', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(live);
      prisma.verificationToken.updateMany.mockResolvedValue({ count: 1 });
      const effect = jest.fn().mockResolvedValue('done');

      await expect(service.consumeOneTime('tok', 'EMAIL_VERIFY', effect)).resolves.toBe('done');
      expect(effect).toHaveBeenCalledWith(USER_ID, prisma);
      expect(firstCallArg(prisma.verificationToken.updateMany)).toEqual({
        where: { id: 'v-1', usedAt: null },
        data: { usedAt: NOW },
      });
    });

    it.each([
      ['unknown', null],
      ['used', { ...live, usedAt: secondsAgo(10) }],
      ['expired', { ...live, expiresAt: secondsAgo(1) }],
      ['of another purpose', { ...live, purpose: 'PASSWORD_RESET' }],
    ])('answers NOT_FOUND for a token that is %s, and runs no effect', async (_name, row) => {
      prisma.verificationToken.findUnique.mockResolvedValue(row);
      const effect = jest.fn();
      await expect(service.consumeOneTime('tok', 'EMAIL_VERIFY', effect)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(effect).not.toHaveBeenCalled();
    });

    it('answers NOT_FOUND when a parallel request spent the token first', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(live);
      prisma.verificationToken.updateMany.mockResolvedValue({ count: 0 });
      const effect = jest.fn();
      await expect(service.consumeOneTime('tok', 'EMAIL_VERIFY', effect)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(effect).not.toHaveBeenCalled();
    });
  });

  describe('sessions started by login', () => {
    it('lock the user and refuse when the verified password hash changed in between', async () => {
      const stale = jest.fn().mockResolvedValue(false);
      await expect(service.issueRefreshChecked(USER_ID, 'ua', stale)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();

      const fresh = jest.fn().mockResolvedValue(true);
      const issued = await service.issueRefreshChecked(USER_ID, 'ua', fresh);
      expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('a revoke voids open Google exchange codes of the user', async () => {
      await service.revokeAll(USER_ID);
      expect(firstCallArg(prisma.verificationToken.updateMany)).toEqual({
        where: { userId: USER_ID, purpose: 'OAUTH_EXCHANGE', usedAt: null },
        data: { usedAt: NOW },
      });
    });
  });

  describe('locking', () => {
    it('rotation and every revoke lock the user row first', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAhead(1000),
        rotatedAt: null,
        revokedAt: null,
      });
      await service.rotate('presented-token', undefined);
      await service.revokeAll(USER_ID);
      await service.revokeAllExcept(USER_ID, 'keep');
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('a revoke that wins the lock first turns the rotation into a 401 and mints nothing', async () => {
      // The pre-lock read still sees a live token; the read under the lock sees the revocation.
      prisma.refreshToken.findUnique
        .mockResolvedValueOnce({ userId: USER_ID })
        .mockResolvedValueOnce({
          id: 'row-1',
          expiresAt: secondsAhead(1000),
          rotatedAt: null,
          revokedAt: secondsAgo(1),
        });
      await expect(service.rotate('presented-token', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('Google sign-up parking', () => {
    const identity = {
      providerUserId: 'g-1',
      email: 'parent@example.com',
      emailVerified: true,
      displayName: 'Parent',
      locale: 'ru' as const,
    };

    it('stores the identity hashed-by-token, sweeps expired rows and returns an opaque token', async () => {
      const token = await service.issueOAuthSignup(identity);
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(firstCallArg(prisma.oAuthSignup.deleteMany)).toEqual({
        where: { expiresAt: { lt: NOW } },
      });
      const { data } = firstCallArg(prisma.oAuthSignup.create) as {
        data: { tokenHash: string; expiresAt: Date; email: string };
      };
      expect(data.tokenHash).toBe(sha(token));
      expect(data.email).toBe('parent@example.com');
      expect(data.expiresAt).toEqual(secondsAhead(600));
    });

    const row = {
      id: 's-1',
      providerUserId: 'g-1',
      email: 'parent@example.com',
      emailVerified: true,
      displayName: 'Parent',
      locale: 'ru',
      expiresAt: secondsAhead(100),
    };

    it('consume sweeps expired rows first, outside the transaction that may roll back', async () => {
      prisma.oAuthSignup.findUnique.mockResolvedValue(null);
      await expect(service.consumeOAuthSignup('tok', jest.fn())).rejects.toBeDefined();
      expect(firstCallArg(prisma.oAuthSignup.deleteMany)).toEqual({
        where: { expiresAt: { lt: NOW } },
      });
    });

    it('consume deletes the row in the same transaction as the effect', async () => {
      prisma.oAuthSignup.findUnique.mockResolvedValue(row);
      prisma.oAuthSignup.deleteMany.mockResolvedValue({ count: 1 });
      const effect = jest.fn().mockResolvedValue('user-id');
      await expect(service.consumeOAuthSignup('tok', effect)).resolves.toBe('user-id');
      expect(effect).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'parent@example.com', locale: 'ru' }),
        prisma,
      );
      expect(prisma.oAuthSignup.deleteMany).toHaveBeenLastCalledWith({ where: { id: 's-1' } });
    });

    it.each([
      ['unknown', null],
      ['expired', { ...row, expiresAt: secondsAgo(1) }],
    ])('consume answers NOT_FOUND for a token that is %s', async (_name, found) => {
      prisma.oAuthSignup.findUnique.mockResolvedValue(found);
      const effect = jest.fn();
      await expect(service.consumeOAuthSignup('tok', effect)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(effect).not.toHaveBeenCalled();
    });

    it('consume answers NOT_FOUND when a parallel request took the row first', async () => {
      prisma.oAuthSignup.findUnique.mockResolvedValue(row);
      prisma.oAuthSignup.deleteMany.mockResolvedValue({ count: 0 });
      const effect = jest.fn();
      await expect(service.consumeOAuthSignup('tok', effect)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(effect).not.toHaveBeenCalled();
    });
  });
});
