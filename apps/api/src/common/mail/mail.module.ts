import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { ConsoleMailAdapter } from './console.adapter.js';
import { MailPort } from './mail.port.js';
import { ResendMailAdapter } from './resend.adapter.js';

/** `EMAIL_PROVIDER` picks the adapter once at boot; everything else injects `MailPort`. */
@Global()
@Module({
  providers: [
    ConsoleMailAdapter,
    ResendMailAdapter,
    {
      provide: MailPort,
      inject: [ConfigService, ConsoleMailAdapter, ResendMailAdapter],
      useFactory: (
        config: ConfigService<Env, true>,
        console_: ConsoleMailAdapter,
        resend: ResendMailAdapter,
      ): MailPort =>
        config.get('EMAIL_PROVIDER', { infer: true }) === 'resend' ? resend : console_,
    },
  ],
  exports: [MailPort],
})
export class MailModule {}
