import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConsentListSchema, LEGAL_VERSIONS } from '@skillboard/shared';
import { firstCallArg } from '../../../test/helpers.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ConsentsService } from './consents.service.js';

const USER_ID = '019a0000-0000-7000-8000-000300000101';
const OLD_VERSION = '2020-01-01';

describe('ConsentsService', () => {
  const prisma = {
    consent: { createMany: jest.fn(), findMany: jest.fn() },
    talentProfile: { findUnique: jest.fn() },
  };
  let service: ConsentsService;

  const accepted = (type: string, version: string) => ({ type, version });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ConsentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ConsentsService);
  });

  describe('record', () => {
    it('stores the current version and language, skipping duplicates', async () => {
      await service.record(USER_ID, ['TERMS', 'PRIVACY'], 'ko');
      expect(firstCallArg(prisma.consent.createMany)).toEqual({
        data: [
          { userId: USER_ID, type: 'TERMS', version: LEGAL_VERSIONS.TERMS, locale: 'ko' },
          { userId: USER_ID, type: 'PRIVACY', version: LEGAL_VERSIONS.PRIVACY, locale: 'ko' },
        ],
        skipDuplicates: true,
      });
    });

    it('is idempotent: the same call twice sends skipDuplicates both times', async () => {
      await service.record(USER_ID, ['PRIVACY'], 'en');
      await service.record(USER_ID, ['PRIVACY'], 'en');
      const calls = prisma.consent.createMany.mock.calls as unknown[][];
      expect(calls).toHaveLength(2);
      for (const [arg] of calls) expect(arg).toMatchObject({ skipDuplicates: true });
    });

    it('collapses repeated documents in one call', async () => {
      await service.record(USER_ID, ['TERMS', 'TERMS'], 'en');
      const arg = firstCallArg(prisma.consent.createMany) as { data: unknown[] };
      expect(arg.data).toHaveLength(1);
    });

    it('uses the caller transaction client when given', async () => {
      const tx = { consent: { createMany: jest.fn() } };
      // The cast is the test double for Prisma.TransactionClient; only `consent` is used.
      await service.record(USER_ID, ['VISA_DISCLAIMER'], 'en', tx as never);
      expect(tx.consent.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.consent.createMany).not.toHaveBeenCalled();
    });
  });

  describe('requiredFor', () => {
    it('is terms and privacy for a client without a profile', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      await expect(service.requiredFor(USER_ID)).resolves.toEqual(['TERMS', 'PRIVACY']);
    });

    it('adds the visa disclaimer for a user with a profile', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue({ id: 'p' });
      await expect(service.requiredFor(USER_ID)).resolves.toEqual([
        'TERMS',
        'PRIVACY',
        'VISA_DISCLAIMER',
      ]);
    });
  });

  describe('pendingFor', () => {
    it('is empty when every required document is accepted at the current version', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      prisma.consent.findMany.mockResolvedValue([
        accepted('TERMS', LEGAL_VERSIONS.TERMS),
        accepted('PRIVACY', LEGAL_VERSIONS.PRIVACY),
      ]);
      await expect(service.pendingFor(USER_ID)).resolves.toEqual([]);
    });

    it('lists only the document whose accepted version is outdated', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      prisma.consent.findMany.mockResolvedValue([
        accepted('TERMS', LEGAL_VERSIONS.TERMS),
        accepted('PRIVACY', OLD_VERSION),
      ]);
      await expect(service.pendingFor(USER_ID)).resolves.toEqual(['PRIVACY']);
    });

    it('never lists the visa disclaimer for a client without a profile', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      prisma.consent.findMany.mockResolvedValue([]);
      await expect(service.pendingFor(USER_ID)).resolves.not.toContain('VISA_DISCLAIMER');
    });

    it('lists the visa disclaimer for a talent who has not accepted it', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue({ id: 'p' });
      prisma.consent.findMany.mockResolvedValue([
        accepted('TERMS', LEGAL_VERSIONS.TERMS),
        accepted('PRIVACY', LEGAL_VERSIONS.PRIVACY),
      ]);
      await expect(service.pendingFor(USER_ID)).resolves.toEqual(['VISA_DISCLAIMER']);
    });

    it('keeps old rows as history: a newer version is pending, an older one stays accepted', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      // The user accepted an older PRIVACY and the current one; both rows exist, nothing is pending.
      prisma.consent.findMany.mockResolvedValue([
        accepted('TERMS', LEGAL_VERSIONS.TERMS),
        accepted('PRIVACY', OLD_VERSION),
        accepted('PRIVACY', LEGAL_VERSIONS.PRIVACY),
      ]);
      await expect(service.pendingFor(USER_ID)).resolves.toEqual([]);
    });
  });

  describe('listForUser', () => {
    it('returns items newest first in the shared shape, plus pending', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      prisma.consent.findMany.mockImplementation((args: { select: Record<string, boolean> }) =>
        // Same mock serves the list (has `locale` in select) and pendingFor (type and version only).
        Promise.resolve(
          args.select.locale
            ? [
                {
                  type: 'TERMS',
                  version: LEGAL_VERSIONS.TERMS,
                  locale: 'ru',
                  acceptedAt: new Date('2026-10-14T01:00:00Z'),
                },
              ]
            : [accepted('TERMS', LEGAL_VERSIONS.TERMS)],
        ),
      );
      const list = await service.listForUser(USER_ID);
      expect(ConsentListSchema.safeParse(list).success).toBe(true);
      expect(list.items[0]).toMatchObject({ type: 'TERMS', locale: 'ru' });
      expect(list.pending).toEqual(['PRIVACY']);
      const listCall = (prisma.consent.findMany.mock.calls as unknown[][])
        .map((c) => c[0] as { orderBy?: unknown })
        .find((arg) => arg.orderBy !== undefined);
      expect(listCall).toMatchObject({ orderBy: { acceptedAt: 'desc' } });
    });

    it('falls back to the default locale for a removed one', async () => {
      prisma.talentProfile.findUnique.mockResolvedValue(null);
      prisma.consent.findMany.mockResolvedValue([
        { type: 'TERMS', version: 'x', locale: 'de', acceptedAt: new Date('2026-10-14T00:00:00Z') },
      ]);
      const list = await service.listForUser(USER_ID);
      expect(list.items[0]?.locale).toBe('en');
    });
  });

  it('does not log user data', async () => {
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map((level) =>
      jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
    );
    prisma.talentProfile.findUnique.mockResolvedValue(null);
    prisma.consent.findMany.mockResolvedValue([]);
    await service.accept(USER_ID, ['TERMS'], 'en');
    for (const spy of spies) {
      const logged = JSON.stringify(spy.mock.calls);
      expect(logged).not.toContain('@');
      expect(logged).not.toContain(USER_ID);
      spy.mockRestore();
    }
  });
});
