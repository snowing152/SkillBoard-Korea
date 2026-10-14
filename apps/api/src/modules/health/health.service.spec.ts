import { Test } from '@nestjs/testing';
import { HealthResponseSchema } from '@skillboard/shared';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  async function build(queryRaw: jest.Mock) {
    const moduleRef = await Test.createTestingModule({
      providers: [HealthService, { provide: PrismaService, useValue: { $queryRaw: queryRaw } }],
    }).compile();
    return moduleRef.get(HealthService);
  }

  it('reports ok when the database answers', async () => {
    const service = await build(jest.fn().mockResolvedValue([{ '?column?': 1 }]));
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.checks.database).toBe('up');
    expect(HealthResponseSchema.safeParse(result).success).toBe(true);
  });

  it('reports degraded when the database throws', async () => {
    const service = await build(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const result = await service.check();
    expect(result).toMatchObject({ status: 'degraded', checks: { database: 'down' } });
  });
});
