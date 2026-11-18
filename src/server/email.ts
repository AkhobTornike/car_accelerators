// Sends one email through Resend (https://resend.com), over plain HTTPS — no extra package.
// RESEND_API_KEY (secret) and MAIL_FROM (an address on a domain verified in Resend) must be set; otherwise
// MailNotConfiguredError is thrown and nothing is sent.

export class MailNotConfiguredError extends Error {
  constructor(readonly missing: string[]) {
    super(`mail not configured: ${missing.join(', ')}`);
  }
}
export class MailSendError extends Error {}

export interface Mail { to: string[]; subject: string; html: string; text: string }

export async function sendMail(mail: Mail, env: Record<string, string | undefined> = process.env, doFetch: typeof fetch = fetch): Promise<void> {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.MAIL_FROM?.trim();
  const missing = [!key && 'RESEND_API_KEY', !from && 'MAIL_FROM'].filter((x): x is string => Boolean(x));
  if (missing.length) throw new MailNotConfiguredError(missing);
  const res = await doFetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) throw new MailSendError(`resend responded ${res.status}`);
}
