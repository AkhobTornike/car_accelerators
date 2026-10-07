import { z } from 'zod';

/**
 * Who the shop is, as printed on receipts and invoices. Lives in the SHOP_PROFILE_JSON environment variable
 * (Vercel secret), not in the repository: the repository is public and this holds the tax id and IBAN.
 * Unset or invalid values fall back to clearly fake demo data, so a receipt can never show a made-up real company.
 */
const text = (max: number) => z.string().trim().max(max);
export const shopProfileSchema = z.object({
  brand: text(60),
  legalName: text(120),
  taxId: text(30),
  address: text(160),
  phone: text(40),
  email: text(80).optional(),
  bank: text(60).optional(),
  iban: text(40).optional(),
  vatPayer: z.boolean(),
  warrantyText: text(1200),
  returnsText: text(600).optional(),
  footerText: text(200).optional(),
  receiptPrefix: text(10),
  paperDefault: z.enum(['a4', 'thermal80']),
});
export type ShopProfile = z.infer<typeof shopProfileSchema>;

export const DEMO_PROFILE: ShopProfile = {
  brand: 'AMPER.GE',
  legalName: 'DEMO — არ არის რეალური რეკვიზიტი',
  taxId: '000000000',
  address: 'თბილისი (დემო მისამართი)',
  phone: '+995 32 255 00 11',
  vatPayer: false,
  warrantyText: 'დემო ტექსტი. რეალური გარანტიის პირობები შეივსება მაღაზიის მონაცემებით.',
  footerText: 'გმადლობთ, რომ გვირჩევთ',
  receiptPrefix: 'R',
  paperDefault: 'a4',
};

export function getShopProfile(raw = process.env.SHOP_PROFILE_JSON): { profile: ShopProfile; demo: boolean } {
  if (!raw) return { profile: DEMO_PROFILE, demo: true };
  try {
    return { profile: shopProfileSchema.parse(JSON.parse(raw)), demo: false };
  } catch {
    return { profile: DEMO_PROFILE, demo: true };
  }
}
