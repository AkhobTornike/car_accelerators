import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans, Noto_Sans_Georgian } from 'next/font/google';
import '../globals.css';
import { en } from '@/components/site/content';

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

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${disp.variable} ${sans.variable} ${mono.variable} ${ge.variable}`}>
      <body>
        <a className="skip" href="#finder">
          {en.skip}
        </a>
        {children}
      </body>
    </html>
  );
}
