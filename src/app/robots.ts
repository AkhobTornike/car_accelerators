import type { MetadataRoute } from 'next';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';

// The admin screens (/m/<secret>/) are deliberately NOT listed here: robots.txt is public, so naming the prefix would
// advertise it. Those pages send `noindex, nofollow` themselves and answer 404 for any other path segment.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
