import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_Georgian } from 'next/font/google';
import '../globals.css';
import { getContent, parseLocale } from '@/lib/i18n/i18n';

const disp = Barlow_Condensed({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-disp',
});

const sans = IBM_Plex_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-mono',
});

const ge = Noto_Sans_Georgian({
  weight: ['400', '600'],
  subsets: ['georgian'],
  variable: '--font-ge',
});

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
