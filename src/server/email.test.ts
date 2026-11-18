import { describe, expect, it, vi } from 'vitest';
import { MailNotConfiguredError, MailSendError, sendMail } from './email';

const mail = { to: ['a@example.com'], subject: 's', html: '<p>h</p>', text: 't' };

describe('sendMail', () => {
  it('refuses to send without configuration and names what is missing', async () => {
    const f = vi.fn();
    await expect(sendMail(mail, {}, f as never)).rejects.toMatchObject({ missing: ['RESEND_API_KEY', 'MAIL_FROM'] });
    await expect(sendMail(mail, { RESEND_API_KEY: 'k' }, f as never)).rejects.toBeInstanceOf(MailNotConfiguredError);
    expect(f).not.toHaveBeenCalled();
  });
  it('posts to Resend with the bearer key', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await sendMail(mail, { RESEND_API_KEY: 'k', MAIL_FROM: 'AMPER <a@ampera.ge>' }, f as never);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer k');
    expect(JSON.parse(init.body)).toMatchObject({ from: 'AMPER <a@ampera.ge>', to: ['a@example.com'], subject: 's' });
  });
  it('throws when Resend rejects the message', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    await expect(sendMail(mail, { RESEND_API_KEY: 'k', MAIL_FROM: 'x' }, f as never)).rejects.toBeInstanceOf(MailSendError);
  });
});
