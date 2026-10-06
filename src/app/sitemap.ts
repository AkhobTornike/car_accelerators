import type { MetadataRoute } from 'next';

const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { ka: `${siteUrl}/`, en: `${siteUrl}/en` };
  return [
    { url: languages.ka, lastModified: new Date(), changeFrequency: 'weekly', priority: 1, alternates: { languages } },
    { url: languages.en, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9, alternates: { languages } },
  ];
}
