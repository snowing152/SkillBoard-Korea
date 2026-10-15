import { LOCALES } from '@skillboard/shared';
import { passwordResetMail, verifyEmailMail } from './templates.js';

describe('mail templates', () => {
  const link = 'https://skillboard.example/en/verify-email?token=abc&x=1';

  it.each(LOCALES)('%s: both mails carry the link in text and html', (locale) => {
    for (const mail of [verifyEmailMail(locale, link), passwordResetMail(locale, link)]) {
      expect(mail.subject.length).toBeGreaterThan(0);
      expect(mail.text).toContain(link);
      expect(mail.html).toContain('token=abc&amp;x=1');
    }
  });

  it('the two mails differ', () => {
    expect(verifyEmailMail('en', link).subject).not.toBe(passwordResetMail('en', link).subject);
  });
});
