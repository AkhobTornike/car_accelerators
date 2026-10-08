import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import { disp, ge, mono, sans } from '@/lib/fonts';
import { getContent, parseLocale } from '@/lib/i18n/i18n';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const locale = parseLocale((await params).lang);
  if (!locale) notFound();
  return (
    <html lang={locale} className={`${disp.variable} ${sans.variable} ${mono.variable} ${ge.variable}`}>
      <body>
        <a className="skip" href="#finder">
          {getContent(locale).skip}
        </a>
        {children}
      </body>
    </html>
  );
}
