import '../globals.css';
import { disp, ge, mono, sans } from '@/lib/fonts';
import { en } from '@/components/site/content';

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
