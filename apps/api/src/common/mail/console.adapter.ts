import { Injectable, Logger } from '@nestjs/common';
import type { MailMessage } from './mail.port.js';
import { MailPort } from './mail.port.js';

/**
 * Development and test only (env validation refuses it in production, rule 11): prints the subject and
 * the body so a developer can click the verification link. The recipient address is never printed.
 */
@Injectable()
export class ConsoleMailAdapter extends MailPort {
  private readonly logger = new Logger(ConsoleMailAdapter.name);

  send(message: MailMessage): Promise<void> {
    this.logger.log(`[mail] ${message.subject}\n${message.text}`);
    return Promise.resolve();
  }
}
