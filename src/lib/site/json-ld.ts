export interface JsonLdCatalogBattery {
  id: string;
  name: string;
  price: number | null;
  stock: 'in' | 'order' | 'out';
}

export interface JsonLdContact {
  phoneDisplay: string;
  address: string;
  hours: string;
  email: string;
}

const AVAILABILITY = {
  in: 'https://schema.org/InStock',
  order: 'https://schema.org/PreOrder',
  out: 'https://schema.org/OutOfStock',
} as const;

export function availabilityOf(stock: JsonLdCatalogBattery['stock']): string {
  return AVAILABILITY[stock];
}

export function buildJsonLd(siteUrl: string, contact: JsonLdContact, products: JsonLdCatalogBattery[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        name: 'AMPER.GE',
        url: siteUrl,
        description: 'Car accumulator sales, fitment confirmation, delivery and installation in Tbilisi. Quote by WhatsApp, phone or Telegram.',
        telephone: contact.phoneDisplay,
        email: contact.email,
        address: { '@type': 'PostalAddress', streetAddress: contact.address, addressLocality: 'Tbilisi', addressCountry: 'GE' },
        openingHours: contact.hours,
        priceRange: '₾₾',
      },
      ...products.map((p) => ({
        '@type': 'Product',
        name: p.name,
        sku: p.id,
        ...(p.price === null
          ? {}
          : { offers: { '@type': 'Offer', priceCurrency: 'GEL', price: p.price, availability: availabilityOf(p.stock), url: siteUrl } }),
      })),
    ],
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
