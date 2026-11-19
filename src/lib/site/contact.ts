const DEFAULT_PHONE = '+995322550011';
const DEFAULT_PHONE_DISPLAY = '+995 32 255 00 11';
const DEFAULT_WHATSAPP = '995555123456';
const DEFAULT_WHATSAPP_DISPLAY = '+995 555 12 34 56';
const DEFAULT_EMAIL = 'hello@ampera.ge';

export const contact = {
  phone: process.env.NEXT_PUBLIC_SHOP_PHONE || DEFAULT_PHONE,
  phoneDisplay: process.env.NEXT_PUBLIC_SHOP_PHONE || DEFAULT_PHONE_DISPLAY,
  whatsapp: process.env.NEXT_PUBLIC_SHOP_WHATSAPP || DEFAULT_WHATSAPP,
  whatsappDisplay: process.env.NEXT_PUBLIC_SHOP_WHATSAPP || DEFAULT_WHATSAPP_DISPLAY,
  email: process.env.NEXT_PUBLIC_SHOP_EMAIL || DEFAULT_EMAIL,
  address: '12 Kakheti Highway, Tbilisi',
  hours: 'Mo-Sa 09:00-19:00',
  telegram: 'https://t.me/ampera_ge',
  telegramHandle: '@ampera_ge',
  facebook: 'https://fb.com/ampera.ge',
  instagram: 'https://instagram.com/ampera.ge',
};

export function waLink(text: string): string {
  return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function telLink(): string {
  return `tel:${contact.phone}`;
}
