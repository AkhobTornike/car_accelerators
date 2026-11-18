import { getSiteUrl } from '@/lib/site/site-url';
import { currentAdminSegment, rotates } from './admin-path';
import { sendMail } from './email';
import type { Rotation } from './security-state';
import { summaryRecipients } from './weekly-summary';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const REASON: Record<Rotation['reason'], string> = {
  'wrong-email': 'ადმინ პანელში შესვლა სცადა უცხო Google ანგარიშმა',
  'new-ip': 'ადმინ პანელში შევიდნენ ახალი IP მისამართიდან',
};

export function buildSecurityAlert(r: Rotation, now: Date, adminUrl: string | null, rotating: boolean): { subject: string; text: string; html: string } {
  const when = new Date(now.getTime() + 4 * 3_600_000).toISOString().replace('T', ' ').slice(0, 16) + ' (თბილისის დრო)';
  const facts = [`მიზეზი: ${REASON[r.reason]}`, `დრო: ${when}`, `IP: ${r.ip}`, ...(r.email ? [`ანგარიში: ${r.email}`] : [])];
  const linkNote = rotating
    ? 'ადმინ ლინკი ავტომატურად შეიცვალა, ძველი ლინკები აღარ მუშაობს.'
    : 'ლინკის როტაცია გამორთულია (ADMIN_PATH_ROTATE=off), ამიტომ ლინკი არ შეცვლილა.';
  const advice = r.reason === 'new-ip' ? 'თუ ეს თქვენ იყავით (ახალი ქსელი ან მოწყობილობა), უბრალოდ გამოიყენეთ ახალი ლინკი.' : 'თუ ეს თქვენ არ იყავით, ახალი ლინკი უკვე დაცულია და ადმინის წვდომა მხოლოდ თქვენს ანგარიშებს აქვს.';
  const text = ['AMPER.GE — უსაფრთხოების შეტყობინება', '', ...facts, '', linkNote, adminUrl ? `ახალი ლინკი: ${adminUrl}` : '', '', advice].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#111;line-height:1.5">
<h2 style="margin:0 0 12px">AMPER.GE — უსაფრთხოების შეტყობინება</h2>
<ul>${facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
<p>${esc(linkNote)}</p>
${adminUrl ? `<p><a href="${esc(adminUrl)}" style="background:#A3E51F;color:#000;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">ახალი ადმინ ლინკი</a></p>` : ''}
<p style="color:#555;font-size:13px">${esc(advice)}</p></div>`;
  return { subject: 'AMPER.GE — უსაფრთხოება: ადმინ ლინკი შეიცვალა', text, html };
}

/** Emails both owners after a rotation. Never throws (a mail outage must not break the admin API). */
export async function sendSecurityAlert(r: Rotation, now: Date = new Date()): Promise<void> {
  try {
    const segment = currentAdminSegment(process.env, now, r.epoch);
    const adminUrl = segment ? `${getSiteUrl()}/m/${segment}/` : null;
    const mail = buildSecurityAlert(r, now, adminUrl, rotates());
    await sendMail({ to: summaryRecipients(), ...mail });
  } catch (e) {
    console.error('security alert failed', e instanceof Error ? e.message : 'unknown');
  }
}
