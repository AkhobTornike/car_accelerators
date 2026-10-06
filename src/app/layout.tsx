import type { Metadata } from 'next';
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_Georgian } from 'next/font/google';
import './globals.css';
import { content } from '@/components/site/content';

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
  title: 'AMPER.GE — Car batteries in Tbilisi',
  description: 'Find the right car battery by vehicle or old-battery code. Fitment confirmed, same-day delivery and installation in Tbilisi.',
  openGraph: {
    title: 'AMPER.GE — Car batteries in Tbilisi',
    description: 'Find the right car battery by vehicle or old-battery code. Same-day delivery and installation.',
    url: '/',
    siteName: 'AMPER.GE',
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${disp.variable} ${sans.variable} ${mono.variable} ${ge.variable}`}>
      <body>
        <a className="skip" href="#finder">
          {content.skip}
        </a>
        {children}
      </body>
    </html>
  );
}
