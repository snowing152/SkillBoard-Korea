import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  type AuthSession,
  type AuthUser,
  DEFAULT_LOCALE,
  type Login,
  LocaleSchema,
  type Register,
} from '@skillboard/shared';
import { argon2id, hash, verify } from 'argon2';
import type { AccessTokenPayload } from '../../common/auth/authenticated-user.js';
import type { Env } from '../../common/config/env.js';
import { ApiError } from '../../common/errors/api-error.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

/** The columns a session response may contain. `passwordHash` is selected only inside login(). */
const userSelect = {
  id: true,
  email: true,
  displayName: true,
  roles: true,
  locale: true,
} satisfies Prisma.UserSelect;
type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

/**
 * Hash of an unguessable password, verified when the email is unknown so that login takes the same
 * time whether or not the account exists (no user enumeration through timing).
 */
const DUMMY_HASH_PROMISE = hash('dummy-password-for-constant-time-login', { type: argon2id });

/**
 * Phase D minimum (ADR 0009, 0019): email + password sign-up and sign-in that return a short-lived
 * access token. Google sign-in, email verification, refresh tokens and password reset are added by the
 * accounts spec in this same service.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(input: Register): Promise<AuthSession> {
    const passwordHash = await hash(input.password, { type: argon2id });
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email, // already trimmed and lower-cased by RegisterSchema
          passwordHash,
          displayName: input.displayName,
          roles: [input.role],
        },
        select: userSelect,
      });
      return await this.session(user);
    } catch (err: unknown) {
      // Unique violation on email: a pre-check would race with concurrent sign-ups, so rely on the DB.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ApiError('CONFLICT', 'Email already registered');
      }
      throw err;
    }
  }

  async login(input: Login): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { ...userSelect, passwordHash: true },
    });
    const ok = user?.passwordHash
      ? await verify(user.passwordHash, input.password)
      : await verify(await DUMMY_HASH_PROMISE, input.password);
    if (!user || !ok) {
      // One message for "no such email", "Google-only account" and "wrong password" (ADR 0018).
      throw new ApiError('UNAUTHENTICATED', 'Invalid email or password');
    }
    const { passwordHash: _hash, ...safe } = user;
    return this.session(safe);
  }

  private async session(user: UserRow): Promise<AuthSession> {
    const payload: AccessTokenPayload = { sub: user.id, roles: user.roles };
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
      // `locale` is a plain column; fall back rather than fail if a row predates a removed locale.
      locale: LocaleSchema.catch(DEFAULT_LOCALE).parse(user.locale),
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      expiresInSeconds: this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
      user: authUser,
    };
  }
}
