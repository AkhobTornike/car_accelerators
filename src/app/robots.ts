import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site/site-url';

// The admin screens (/m/<secret>/) are deliberately NOT listed here: robots.txt is public, so naming the prefix would
// advertise it. Those pages send `noindex, nofollow` themselves and answer 404 for any other path segment.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
