import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { firstCallArg } from '../../../test/helpers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { TokensService } from './tokens.service.js';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const PEPPER = 'p'.repeat(32);
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
    $transaction: jest.fn(),
  };
  let service: TokensService;

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as unknown[]),
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

    it('rotates a live token: revokes it and issues the next one', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAhead(1000),
        revokedAt: null,
      });
      const rotated = await service.rotate('presented-token', 'ua');

      expect(firstCallArg(prisma.refreshToken.findUnique)).toMatchObject({
        where: { tokenHash: sha('presented-token') },
      });
      expect(firstCallArg(prisma.refreshToken.updateMany)).toEqual({
        where: { id: 'row-1', revokedAt: null },
        data: { revokedAt: NOW },
      });
      expect(rotated.userId).toBe(USER_ID);
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('treats a token rotated 5 s ago as a concurrent refresh: new pair, nothing revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAhead(1000),
        revokedAt: secondsAgo(5),
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
        revokedAt: secondsAgo(GRACE_SECONDS + 1),
      });
      await expect(service.rotate('presented-token', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(firstCallArg(prisma.refreshToken.updateMany)).toMatchObject({
        where: { userId: USER_ID, revokedAt: null },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('treats an expired token like a replay', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'row-1',
        userId: USER_ID,
        expiresAt: secondsAgo(1),
        revokedAt: null,
      });
      await expect(service.rotate('presented-token', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledTimes(1);
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('answers 401 for an unknown token without revoking anything', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.rotate('unknown', undefined)).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('marks deliberate revocations as older than the grace, so a later replay is detected', async () => {
      await service.revokeAll(USER_ID);
      const { data } = firstCallArg(prisma.refreshToken.updateMany) as {
        data: { revokedAt: Date };
      };
      expect(NOW.getTime() - data.revokedAt.getTime()).toBeGreaterThan(GRACE_SECONDS * 1000);
    });

    it('logout of one token only touches that user’s row', async () => {
      await service.revoke(USER_ID, 'presented-token');
      expect(firstCallArg(prisma.refreshToken.updateMany)).toMatchObject({
        where: { userId: USER_ID, tokenHash: sha('presented-token'), revokedAt: null },
      });
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
});
