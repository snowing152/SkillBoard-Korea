export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Outgoing email as a port (ADR 0013): services depend on this class, the module picks the adapter.
 * An abstract class (not an interface) so it can be a Nest injection token and be replaced in tests.
 */
export abstract class MailPort {
  abstract send(message: MailMessage): Promise<void>;
}
