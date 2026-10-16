import type { Locale } from '@skillboard/shared';

type Template = { subject: string; intro: string; action: string; ignore: string };

/**
 * The two emails of the accounts spec, one entry per UI language (the user's `locale` picks it).
 * Plain text first; the HTML part is the same text with the link made clickable.
 */
const VERIFY_EMAIL: Record<Locale, Template> = {
  en: {
    subject: 'Confirm your email for SkillBoard Korea',
    intro: 'Welcome to SkillBoard Korea! Please confirm your email address to go live.',
    action: 'Confirm email',
    ignore: 'If you did not create this account, you can ignore this message.',
  },
  ko: {
    subject: 'SkillBoard Korea 이메일 주소를 확인해 주세요',
    intro: 'SkillBoard Korea에 오신 것을 환영합니다! 이메일 주소를 확인하면 프로필이 공개됩니다.',
    action: '이메일 확인',
    ignore: '본인이 가입하지 않았다면 이 메시지를 무시하셔도 됩니다.',
  },
  ru: {
    subject: 'Подтвердите email для SkillBoard Korea',
    intro:
      'Добро пожаловать в SkillBoard Korea! Подтвердите адрес почты, чтобы профиль стал виден.',
    action: 'Подтвердить email',
    ignore: 'Если вы не создавали этот аккаунт, просто проигнорируйте письмо.',
  },
};

const PASSWORD_RESET: Record<Locale, Template> = {
  en: {
    subject: 'Reset your SkillBoard Korea password',
    intro: 'Use the link below to choose a new password. It works for one hour.',
    action: 'Choose a new password',
    ignore:
      'If you did not ask for this, you can ignore this message; your password stays as it is.',
  },
  ko: {
    subject: 'SkillBoard Korea 비밀번호 재설정',
    intro: '아래 링크에서 새 비밀번호를 설정하세요. 링크는 1시간 동안 유효합니다.',
    action: '새 비밀번호 설정',
    ignore: '요청하지 않으셨다면 이 메시지를 무시하세요. 비밀번호는 변경되지 않습니다.',
  },
  ru: {
    subject: 'Сброс пароля SkillBoard Korea',
    intro: 'Перейдите по ссылке и задайте новый пароль. Ссылка действует один час.',
    action: 'Задать новый пароль',
    ignore: 'Если вы не запрашивали сброс, просто проигнорируйте письмо: пароль не изменится.',
  },
};

export type RenderedMail = { subject: string; text: string; html: string };

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function render(t: Template, link: string): RenderedMail {
  const safeLink = escapeHtml(link);
  return {
    subject: t.subject,
    text: `${t.intro}\n\n${t.action}: ${link}\n\n${t.ignore}`,
    html:
      `<p>${escapeHtml(t.intro)}</p>` +
      `<p><a href="${safeLink}">${escapeHtml(t.action)}</a></p>` +
      `<p>${escapeHtml(t.ignore)}</p>`,
  };
}

export function verifyEmailMail(locale: Locale, link: string): RenderedMail {
  return render(VERIFY_EMAIL[locale], link);
}

export function passwordResetMail(locale: Locale, link: string): RenderedMail {
  return render(PASSWORD_RESET[locale], link);
}
