import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Env } from '../../common/config/env.js';
import { ConsentsModule } from '../consents/consents.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleCallbackGuard, GoogleStartGuard } from './google.guards.js';
import { GoogleStrategy } from './google.strategy.js';
import { MeController } from './me.controller.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [
    ConsentsModule,
    PassportModule,
    // Global so JwtAuthGuard (registered in app.module.ts) can inject JwtService from the root.
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }) },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, TokensService, GoogleStrategy, GoogleStartGuard, GoogleCallbackGuard],
})
export class AuthModule {}
