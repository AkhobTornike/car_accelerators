import { adminHandle, adminJson } from '@/server/admin-http';
import { MailNotConfiguredError } from '@/server/email';
import { takeManualSlot } from '@/server/send-limit';
import { sendWeeklySummary } from '@/server/weekly-summary';

// The admin panel's "send the summary now" button (at most 10 a day, see send-limit.ts). The recipient list comes from the server, never from the request.
export const POST = (request: Request) =>
  adminHandle(request, async () => {
    const slot = await takeManualSlot();
    if (!slot.allowed) return adminJson({ error: 'too_many_summaries' }, 429);
    try {
      const { to } = await sendWeeklySummary();
      return adminJson({ sent: true, to });
    } catch (e) {
      if (e instanceof MailNotConfiguredError) return adminJson({ error: 'mail_not_configured', details: e.missing }, 503);
      throw e;
    }
  });
