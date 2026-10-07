import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicCatalog } from '@/server/catalog';
import Finder from '@/components/finder/Finder';
import Catalog from '@/components/site/Catalog';
import Contact from '@/components/site/Contact';
import Faq from '@/components/site/Faq';
import Hero from '@/components/site/Hero';
import How from '@/components/site/How';
import MobileBar from '@/components/site/MobileBar';
import SiteFooter from '@/components/site/SiteFooter';
import SiteHeader from '@/components/site/SiteHeader';
import SiteIcons from '@/components/site/SiteIcons';
import Tech from '@/components/site/Tech';
import Why from '@/components/site/Why';
import { getContent, parseLocale } from '@/lib/i18n/i18n';
import { locales } from '@/lib/i18n/types';
import { contact } from '@/lib/site/contact';
import { buildJsonLd, serializeJsonLd } from '@/lib/site/json-ld';

// The catalogue section reads live prices, stock and photos: rebuild the static page at most once a minute.
export const revalidate = 60;
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

async function langOf(params: Promise<{ lang: string }>) {
  const parsed = parseLocale((await params).lang);
  if (!parsed) notFound();
  return parsed;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = await langOf(params);
  const meta = getContent(lang).meta;
  const canonical = lang === 'ka' ? '/' : '/en';
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.ogDescription,
      url: canonical,
      siteName: 'AMPER.GE',
      type: 'website',
      locale: lang === 'ka' ? 'ka_GE' : 'en_US',
    },
    alternates: { canonical, languages: { ka: '/', en: '/en', 'x-default': '/' } },
  };
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getContent(lang);
  const catalog = await getPublicCatalog();
  const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
  const jsonLd = serializeJsonLd(
    buildJsonLd(
      siteUrl,
      { phoneDisplay: contact.phoneDisplay, address: contact.address, hours: contact.hours, email: contact.email },
      catalog.map((b) => ({ id: b.id, name: b.name, price: b.price, stock: b.stock })),
      { inLanguage: lang, description: t.meta.description },
    ),
  );
  return (
    <>
      <SiteIcons />
      <SiteHeader t={t} lang={lang} />
      <main>
        <Hero t={t.hero} quoteMessage={t.common.quoteMessage} />
        <section id="finder" aria-labelledby="finder-h">
          <div className="wrap">
            <p className="eyebrow">{t.finder.eyebrow}</p>
            <h2 className="h2" id="finder-h">
              {t.finder.heading}
            </h2>
            <Finder t={t.finder} />
            <p className="find-note">
              <span>{t.finder.disclaimer}</span>
            </p>
          </div>
        </section>
        <Catalog t={t} />
        <Tech t={t.tech} />
        <Why t={t.why} />
        <How t={t.how} />
        <Faq t={t.faq} />
        <Contact t={t.contact} quoteMessage={t.common.quoteMessage} />
      </main>
      <SiteFooter t={t} />
      <MobileBar t={t.mbar} quoteMessage={t.common.quoteMessage} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
