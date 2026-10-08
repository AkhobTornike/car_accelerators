import localFont from 'next/font/local';

// Fonts ship with the app (the @fontsource packages hold the woff2 files) instead of being downloaded from Google
// at build time: a Google Fonts hiccup used to fail whole Vercel builds. The CSS variable names are unchanged.
// next/font needs literal options, so the paths are written out in full.
export const disp = localFont({
  src: [
    { path: '../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-disp',
  display: 'swap',
});

export const sans = localFont({
  src: [
    { path: '../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const mono = localFont({
  src: [
    { path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
});

export const ge = localFont({
  src: [
    { path: '../../node_modules/@fontsource/noto-sans-georgian/files/noto-sans-georgian-georgian-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans-georgian/files/noto-sans-georgian-georgian-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-ge',
  display: 'swap',
});
