import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site/site-url';


export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const languages = { ka: `${siteUrl}/`, en: `${siteUrl}/en` };
  return [
    { url: languages.ka, lastModified: new Date(), changeFrequency: 'weekly', priority: 1, alternates: { languages } },
    { url: languages.en, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9, alternates: { languages } },
  ];
}
