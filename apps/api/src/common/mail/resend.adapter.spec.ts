import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { TEST_RESEND_API_KEY } from '../../../test/fixtures/credentials.js';
import { ResendMailAdapter } from './resend.adapter.js';

describe('ResendMailAdapter', () => {
  const values: Record<string, string> = {
    RESEND_API_KEY: TEST_RESEND_API_KEY,
    EMAIL_FROM: 'SkillBoard Korea <noreply@example.com>',
  };
  const config = { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>;
  const message = { to: 'anna@example.com', subject: 'Hi', text: 'Body', html: '<p>Body</p>' };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('posts the message to Resend with the bearer key', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }));
    await new ResendMailAdapter(config).send(message);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${TEST_RESEND_API_KEY}`,
    );
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: values.EMAIL_FROM,
      to: ['anna@example.com'],
      subject: 'Hi',
    });
  });

  it('throws without leaking the address when the provider refuses', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 422 }));
    const result = new ResendMailAdapter(config).send(message);
    await expect(result).rejects.toThrow('Mail provider answered 422');
    await expect(result).rejects.not.toThrow('anna@example.com');
  });
});
