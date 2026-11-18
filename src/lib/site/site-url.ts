// The public base URL of the site. robots.txt, sitemap.xml, canonical and hreflang links, Open Graph and the JSON-LD
// are all built from it, so it must never silently fall back to localhost on a deployed site.
//
// Order: SITE_URL (set it to the real domain, e.g. https://ampera.ge) -> the Vercel production domain that Vercel
// injects (VERCEL_PROJECT_PRODUCTION_URL, e.g. ampera-ge.vercel.app) -> http://localhost:3000 for local development.
export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}
