import type { Battery, Sale, SaleVoid } from '@core/types';
import { getSiteUrl } from '@/lib/site/site-url';
import { currentAdminSegment, rotates } from './admin-path';
import { sendMail } from './email';
import { getAdminEpoch } from './security-state';
import { getInventory, getRepository } from './repository';

// The weekly email for the owner: last 7 days of sales, what is running out, shelf value and the (weekly) admin link.
// Sent every Monday by the Vercel cron (/api/cron/weekly-summary) and on demand from the admin panel
// (at most MANUAL_SENDS_PER_DAY times a day, see send-limit.ts).

export const DEFAULT_SUMMARY_TO = ['Bezhitashvili15@gmail.com', 'amperagebattery@gmail.com'];
export const LOW_STOCK_AT = 3; // same threshold the admin stock table highlights
const DAY = 86_400_000;

export interface SummaryInput {
  now: Date;
  sales: Sale[];
  voids: SaleVoid[];
  previousSales: Sale[];
  batteries: Battery[];
  adminUrl: string | null;
  rotating: boolean;
}

const gel = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₾`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
const day = (d: Date) => d.toISOString().slice(0, 10);

function totals(sales: Sale[], voided: Set<string>) {
  const live = sales.filter((s) => !voided.has(s.id));
  let revenue = 0, units = 0, profit = 0, profitKnown = false;
  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const s of live) {
    revenue += s.total;
    for (const l of s.lines) {
      units += l.qty;
      const p = byProduct.get(l.batteryId) ?? { name: l.name, qty: 0, revenue: 0 };
      p.qty += l.qty;
      p.revenue += l.qty * l.unitPrice;
      byProduct.set(l.batteryId, p);
      if (l.unitCost != null) { profit += l.qty * (l.unitPrice - l.unitCost); profitKnown = true; }
    }
  }
  const top = [...byProduct.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5);
  return { count: live.length, revenue, units, profit: profitKnown ? profit : null, top };
}

export function buildWeeklySummary(i: SummaryInput): { subject: string; text: string; html: string } {
  const voided = new Set(i.voids.map((v) => v.saleId));
  const cur = totals(i.sales, voided);
  const prev = totals(i.previousSales, new Set());
  const from = new Date(i.now.getTime() - 7 * DAY);

  const active = i.batteries.filter((b) => b.active);
  const qty = (b: Battery) => b.quantity ?? 0;
  const low = active.filter((b) => qty(b) > 0 && qty(b) <= LOW_STOCK_AT).sort((a, b) => qty(a) - qty(b));
  const out = active.filter((b) => qty(b) === 0);
  const units = active.reduce((n, b) => n + qty(b), 0);
  const retail = active.reduce((n, b) => n + qty(b) * (b.price ?? 0), 0);
  const cost = active.reduce((n, b) => n + qty(b) * (b.costPrice ?? 0), 0);
  const noPrice = active.filter((b) => b.price == null).length;

  const delta = prev.revenue > 0 ? Math.round(((cur.revenue - prev.revenue) / prev.revenue) * 100) : null;
  const deltaText = delta == null ? '' : ` (წინა კვირასთან შედარებით ${delta >= 0 ? '+' : ''}${delta}%)`;

  const rows: [string, string][] = [
    ['გაყიდვები', `${cur.count}`],
    ['შემოსავალი', `${gel(cur.revenue)}${deltaText}`],
    ['გაყიდული ცალი', `${cur.units}`],
  ];
  if (cur.profit != null) rows.push(['სავარაუდო მოგება', gel(cur.profit)]);
  if (voided.size) rows.push(['გაუქმებული გაყიდვა', `${voided.size}`]);

  const lines: string[] = [`AMPER.GE — კვირის შეჯამება (${day(from)} – ${day(i.now)})`, ''];
  lines.push('გაყიდვები', ...rows.map(([k, v]) => `  ${k}: ${v}`), '');
  if (cur.top.length) lines.push('ყველაზე ხშირად გაყიდული', ...cur.top.map((p) => `  ${p.name} — ${p.qty} ცალი (${gel(p.revenue)})`), '');
  lines.push(`მარაგი ბოლოს (${LOW_STOCK_AT} ცალი ან ნაკლები)`);
  lines.push(...(low.length ? low.slice(0, 15).map((b) => `  ${b.name} — დარჩა ${qty(b)}`) : ['  არაფერი']));
  if (low.length > 15) lines.push(`  ... და კიდევ ${low.length - 15}`);
  lines.push('', `მარაგში არ არის: ${out.length} პროდუქტი${out.length ? ` (მაგ. ${out.slice(0, 6).map((b) => b.name).join(', ')})` : ''}`);
  lines.push('', 'მარაგის მდგომარეობა', `  აქტიური პროდუქტი: ${active.length}`, `  ცალი თაროზე: ${units}`, `  ღირებულება გასაყიდი ფასით: ${gel(retail)}`);
  if (cost > 0) lines.push(`  თვითღირებულება: ${gel(cost)}`);
  if (noPrice) lines.push(`  ფასი არ არის მითითებული: ${noPrice} პროდუქტზე`);
  lines.push('', i.adminUrl ? `ადმინ პანელი${i.rotating ? ' (ეს კვირის ლინკი)' : ''}: ${i.adminUrl}` : 'ადმინ პანელის მისამართი არ არის დაყენებული.');
  if (i.rotating) lines.push('ლინკი ყოველ კვირას იცვლება; წინა კვირის ლინკი კიდევ ერთი კვირა მუშაობს.');
  const text = lines.join('\n');

  const li = (s: string) => `<li>${esc(s)}</li>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#111;line-height:1.5">
<h2 style="margin:0 0 4px">AMPER.GE — კვირის შეჯამება</h2>
<p style="margin:0 0 16px;color:#555">${day(from)} – ${day(i.now)}</p>
<h3>გაყიდვები</h3>
<table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#555">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table>
${cur.top.length ? `<h3>ყველაზე ხშირად გაყიდული</h3><ul>${cur.top.map((p) => li(`${p.name} — ${p.qty} ცალი (${gel(p.revenue)})`)).join('')}</ul>` : ''}
<h3>მარაგი ბოლოს (${LOW_STOCK_AT} ცალი ან ნაკლები)</h3>
<ul>${(low.length ? low.slice(0, 15).map((b) => li(`${b.name} — დარჩა ${qty(b)}`)) : [li('არაფერი')]).join('')}${low.length > 15 ? li(`... და კიდევ ${low.length - 15}`) : ''}</ul>
<p>მარაგში არ არის: <b>${out.length}</b> პროდუქტი${out.length ? ` (მაგ. ${esc(out.slice(0, 6).map((b) => b.name).join(', '))})` : ''}</p>
<h3>მარაგის მდგომარეობა</h3>
<ul>${li(`აქტიური პროდუქტი: ${active.length}`)}${li(`ცალი თაროზე: ${units}`)}${li(`ღირებულება გასაყიდი ფასით: ${gel(retail)}`)}${cost > 0 ? li(`თვითღირებულება: ${gel(cost)}`) : ''}${noPrice ? li(`ფასი არ არის მითითებული: ${noPrice} პროდუქტზე`) : ''}</ul>
${i.adminUrl ? `<p style="margin-top:20px"><a href="${esc(i.adminUrl)}" style="background:#A3E51F;color:#000;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">ადმინ პანელის გახსნა</a></p>${i.rotating ? '<p style="color:#555;font-size:13px">ლინკი ყოველ კვირას იცვლება; წინა კვირის ლინკი კიდევ ერთი კვირა მუშაობს.</p>' : ''}` : '<p>ადმინ პანელის მისამართი არ არის დაყენებული.</p>'}
</div>`;

  return { subject: `AMPER.GE — კვირის შეჯამება: ${cur.count} გაყიდვა, ${gel(cur.revenue)}`, text, html };
}

export function summaryRecipients(env: Record<string, string | undefined> = process.env): string[] {
  const list = (env.SUMMARY_EMAIL_TO ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  return list.length ? list : [...DEFAULT_SUMMARY_TO];
}

export async function sendWeeklySummary(now: Date = new Date()): Promise<{ to: string[] }> {
  const inventory = getInventory();
  const [{ sales, voids }, previous, batteries] = await Promise.all([
    inventory.listSales({ from: new Date(now.getTime() - 7 * DAY).toISOString(), to: now.toISOString() }),
    inventory.listSales({ from: new Date(now.getTime() - 14 * DAY).toISOString(), to: new Date(now.getTime() - 7 * DAY).toISOString() }),
    getRepository().listBatteries(),
  ]);
  const segment = currentAdminSegment(process.env, now, await getAdminEpoch());
  const adminUrl = segment ? `${getSiteUrl()}/m/${segment}/` : null;
  const mail = buildWeeklySummary({ now, sales, voids, previousSales: previous.sales, batteries, adminUrl, rotating: rotates() });
  const to = summaryRecipients();
  await sendMail({ to, ...mail });
  return { to };
}
