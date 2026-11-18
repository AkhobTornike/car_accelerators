import { createHash, timingSafeEqual } from 'node:crypto';
import { MailNotConfiguredError } from '@/server/email';
import { sendWeeklySummary } from '@/server/weekly-summary';

// Called by the Vercel cron in vercel.json. Vercel sends "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET
// environment variable exists. Fails closed: without CRON_SECRET nothing can trigger this route.
const digest = (s: string) => createHash('sha256').update(s).digest();

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';
  if (!secret || !timingSafeEqual(digest(given), digest(secret))) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const { to } = await sendWeeklySummary();
    return Response.json({ sent: true, to: to.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof MailNotConfiguredError) return Response.json({ error: 'mail_not_configured', missing: e.missing }, { status: 503 });
    console.error('weekly summary failed', e instanceof Error ? e.message : 'unknown');
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
