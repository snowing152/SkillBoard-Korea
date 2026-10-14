import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthSessionSchema } from '@skillboard/shared';
import { firstCallArg } from '../../../test/helpers.js';
import { ApiError } from '../../common/errors/api-error.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AuthService } from './auth.service.js';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const TTL = 900;

describe('AuthService', () => {
  const prisma = { user: { create: jest.fn(), findUnique: jest.fn() } };
  let service: AuthService;
  let jwt: JwtService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'x'.repeat(32), signOptions: { expiresIn: TTL } })],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => TTL } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  const input = { email: 'anna@example.com', password: 'Password123!', displayName: 'Anna' };
  const row = {
    id: USER_ID,
    email: input.email,
    displayName: 'Anna',
    roles: ['TALENT'],
    locale: 'en',
  };

  it('register stores an argon2id hash, never the password, and returns a session', async () => {
    prisma.user.create.mockResolvedValue(row);
    const session = await service.register({ ...input, role: 'TALENT' });

    const { data } = firstCallArg(prisma.user.create) as { data: { passwordHash: string } };
    expect(data.passwordHash).toMatch(/^\$argon2id\$/);
    expect(data.passwordHash).not.toContain(input.password);
    expect(AuthSessionSchema.safeParse(session).success).toBe(true);
    expect(JSON.stringify(session)).not.toContain('passwordHash');
    expect(jwt.verify(session.accessToken)).toMatchObject({ sub: USER_ID, roles: ['TALENT'] });
  });

  it('register maps a unique-email violation to CONFLICT', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(service.register({ ...input, role: 'CLIENT' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('login rejects a wrong password and an unknown email with the same error', async () => {
    const { argon2id, hash } = await import('argon2');
    prisma.user.findUnique.mockResolvedValueOnce({
      ...row,
      passwordHash: await hash('other-password', { type: argon2id }),
    });
    const wrong = service.login({ email: input.email, password: input.password });
    await expect(wrong).rejects.toBeInstanceOf(ApiError);
    await expect(wrong).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = service.login({ email: 'nobody@example.com', password: input.password });
    await expect(unknown).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Invalid email or password',
    });
  });

  it('login returns a session for the right password', async () => {
    const { argon2id, hash } = await import('argon2');
    prisma.user.findUnique.mockResolvedValue({
      ...row,
      passwordHash: await hash(input.password, { type: argon2id }),
    });
    const session = await service.login({ email: input.email, password: input.password });
    expect(session.user).toEqual(row);
    expect(session.expiresInSeconds).toBe(TTL);
  });
});
