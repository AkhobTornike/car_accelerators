import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import { disp, ge, mono, sans } from '@/lib/fonts';
import Analytics from '@/components/site/Analytics';
import { parseGaId } from '@/lib/analytics';
import { getContent, parseLocale } from '@/lib/i18n/i18n';
import { getSiteUrl } from '@/lib/site/site-url';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  // Google Search Console "HTML tag" verification: paste only the content value into NEXT_PUBLIC_GSC_VERIFICATION.
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } } : {}),
};

export const viewport: Viewport = { themeColor: '#000000', colorScheme: 'light' };

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const locale = parseLocale((await params).lang);
  if (!locale) notFound();
  const gaId = parseGaId(process.env.NEXT_PUBLIC_GA_ID);
  return (
    <html lang={locale} className={`${disp.variable} ${sans.variable} ${mono.variable} ${ge.variable}`}>
      <body>
        <a className="skip" href="#finder">
          {getContent(locale).skip}
        </a>
        {children}
        {gaId && <Analytics id={gaId} t={getContent(locale).consent} />}
      </body>
    </html>
  );
}
