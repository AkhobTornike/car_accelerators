import type { Metadata } from 'next';
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_Georgian } from 'next/font/google';
import './globals.css';

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

export const metadata: Metadata = {
  title: 'AMPER.GE — Battery finder',
  description: 'Find the right battery for your car or van.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${disp.variable} ${sans.variable} ${mono.variable} ${ge.variable}`}>
      <body>{children}</body>
    </html>
  );
}
