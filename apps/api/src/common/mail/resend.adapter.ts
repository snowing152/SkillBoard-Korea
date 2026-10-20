import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type { MailMessage } from './mail.port.js';
import { MailPort } from './mail.port.js';

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

/**
 * Resend over plain `fetch`, no SDK: the SDK pulls in ESM-only dependencies that Jest (CommonJS)
 * cannot load, and one POST is all we need. Failures are logged without the address or the body.
 */
@Injectable()
export class ResendMailAdapter extends MailPort {
  private readonly logger = new Logger(ResendMailAdapter.name);

  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  async send(message: MailMessage): Promise<void> {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.get('RESEND_API_KEY', { infer: true })}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.get('EMAIL_FROM', { infer: true }),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      this.logger.warn(`mail provider answered ${res.status}`);
      throw new Error(`Mail provider answered ${res.status}`);
    }
  }
}
