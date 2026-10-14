import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../../common/config/env.js';
import { AuthController } from './auth.controller.js';
import { ConsentsModule } from '../consents/consents.module.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    ConsentsModule,
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
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
