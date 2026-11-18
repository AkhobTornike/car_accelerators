import { adminHandle, adminJson } from '@/server/admin-http';
import { MailNotConfiguredError } from '@/server/email';
import { sendWeeklySummary } from '@/server/weekly-summary';

// The admin panel's "send the weekly summary now" button. The recipient list comes from the server, never from the request.
export const POST = (request: Request) =>
  adminHandle(request, async () => {
    try {
      const { to } = await sendWeeklySummary();
      return adminJson({ sent: true, to });
    } catch (e) {
      if (e instanceof MailNotConfiguredError) return adminJson({ error: 'mail_not_configured', details: e.missing }, 503);
      throw e;
    }
  });
