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
import { content } from '@/components/site/content';
import { contact } from '@/lib/site/contact';
import { buildJsonLd, serializeJsonLd } from '@/lib/site/json-ld';

export default async function Home() {
  const catalog = await getPublicCatalog();
  const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
  const jsonLd = serializeJsonLd(
    buildJsonLd(
      siteUrl,
      { phoneDisplay: contact.phoneDisplay, address: contact.address, hours: contact.hours, email: contact.email },
      catalog.map((b) => ({ id: b.id, name: b.name, price: b.price, stock: b.stock })),
    ),
  );
  return (
    <>
      <SiteIcons />
      <SiteHeader />
      <main>
        <Hero />
        <section id="finder" aria-labelledby="finder-h">
          <div className="wrap">
            <p className="eyebrow">{content.finder.eyebrow}</p>
            <h2 className="h2" id="finder-h">
              {content.finder.heading}
            </h2>
            <Finder />
            <p className="find-note">
              <span>{content.finder.disclaimer}</span>
            </p>
          </div>
        </section>
        <Catalog />
        <Tech />
        <Why />
        <How />
        <Faq />
        <Contact />
      </main>
      <SiteFooter />
      <MobileBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
