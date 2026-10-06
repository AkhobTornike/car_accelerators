export interface TechColumn {
  name: string;
  full: string;
  text: string;
  cycles: number;
  verdictOk: boolean;
  verdict: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface SiteContent {
  brand: { name: string; tld: string };
  skip: string;
  menu: string;
  nav: { label: string; href: string }[];
  hero: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    lede: string;
    whatsapp: string;
    call: string;
    facts: string[];
    photoAlt: string;
    photoModel: string;
    photoTag: string;
  };
  finder: {
    eyebrow: string;
    heading: string;
    disclaimer: string;
    notSure: {
      tab: string;
      phone: string;
      phonePlaceholder: string;
      car: string;
      carPlaceholder: string;
      vin: string;
      note: string;
      notePlaceholder: string;
      submit: string;
      hint: string;
      phoneRequired: string;
      carRequired: string;
    };
  };
  catalog: {
    eyebrow: string;
    heading: string;
    chips: { id: string; label: string }[];
    note: string;
    from: string;
    askForPrice: string;
    spec: string;
    dims: string;
    warranty: string;
    months: string;
    ask: string;
    empty: string;
  };
  tech: {
    eyebrow: string;
    heading: string;
    columns: TechColumn[];
    startStopTitle: string;
    startStopText: string;
    anatomyEyebrow: string;
    anatomyHeading: string;
    anatomy: { title: string; text: string }[];
    photoHint: string;
    figure: {
      label: string;
      polarity: string;
      brand: string;
      spec: string;
      specAh: string;
      specCca: string;
      specDin: string;
      dims: string;
      dateCode: string;
      stateEye: string;
    };
  };
  why: {
    eyebrow: string;
    heading: string;
    items: { title: string; text: string }[];
    photoAlt: string;
    photoCaption: string;
  };
  how: { eyebrow: string; heading: string; steps: { n: string; title: string; text: string }[] };
  faq: { eyebrow: string; heading: string; items: FaqItem[] };
  contact: {
    eyebrow: string;
    heading: string;
    name: string;
    phone: string;
    phonePlaceholder: string;
    vehicle: string;
    vehiclePlaceholder: string;
    battery: string;
    batteryPlaceholder: string;
    channel: string;
    channels: string[];
    note: string;
    notePlaceholder: string;
    submit: string;
    hint: string;
    nameRequired: string;
    phoneRequired: string;
    whatsappTitle: string;
    counterTitle: string;
    telegramTitle: string;
    emailTitle: string;
    facebookTitle: string;
    instagramTitle: string;
    copyTelegram: string;
    copyEmail: string;
    copied: string;
    hoursPrefix: string;
    hoursDays: string;
    hoursMid: string;
    hoursWarehouse: string;
    hoursAddress: string;
    hoursSuffix: string;
  };
  footer: { nav: { label: string; href: string }[] };
  mbar: { whatsapp: string; call: string };
  demoNotice: string;
}

export const content: SiteContent = {
  brand: { name: 'AMPER', tld: '.GE' },
  skip: 'Skip to battery finder',
  menu: 'Menu',
  nav: [
    { label: 'Finder', href: '#finder' },
    { label: 'Catalog', href: '#catalog' },
    { label: 'Technology', href: '#tech' },
    { label: 'Why us', href: '#why' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ],
  hero: {
    eyebrow: 'Tbilisi · Car accumulators · Since 2009',
    titleA: 'Right battery.',
    titleB: 'First start.',
    lede: 'Search by your car, or by the code printed on your old battery. We confirm fitment, quote on WhatsApp, and fit it the same day. One expert owns your order from first message to installed terminals.',
    whatsapp: 'WhatsApp us',
    call: 'Call the counter',
    facts: ['24–48 mo warranty', 'Fitment confirmed before dispatch', 'Same-day delivery & install'],
    photoAlt: 'AMPER AGM 68 battery on the counter test bay',
    photoModel: 'AMPER AGM 68',
    photoTag: 'bay check №4 812',
  },
  finder: {
    eyebrow: 'Battery finder',
    heading: 'Three ways to the right battery',
    disclaimer: 'Fitment is always confirmed by our team before installation.',
    notSure: {
      tab: 'Not sure — send a photo',
      phone: 'Phone / WhatsApp',
      phonePlaceholder: '+995 ___ __ __ __',
      car: 'Car (year, make, model)',
      carPlaceholder: '2018 VW Passat 1.4 TSI',
      vin: 'VIN (optional)',
      note: 'What happened?',
      notePlaceholder: 'Doesn’t start in the morning. Dashboard says start-stop unavailable.',
      submit: 'Send to the counter',
      hint: 'An expert replies on WhatsApp within working hours — usually under 15 minutes.',
      phoneRequired: 'Phone number is required so the counter can reach you.',
      carRequired: 'Tell us the car so we can match the battery.',
    },
  },
  catalog: {
    eyebrow: 'Catalog',
    heading: 'Batteries this week',
    chips: [
      { id: 'all', label: 'All' },
      { id: 'car', label: 'Car' },
      { id: 'truck', label: 'Truck' },
      { id: 'moto', label: 'Moto' },
      { id: 'deep', label: 'Deep-cycle' },
      { id: 'SMF', label: 'SMF' },
      { id: 'EFB', label: 'EFB' },
      { id: 'AGM', label: 'AGM' },
    ],
    note: 'Prices include the old-battery buy-back discount when you hand in your old unit. Stock is re-counted every morning; WhatsApp shows live numbers.',
    from: 'from',
    askForPrice: 'Ask for price',
    spec: 'Spec',
    dims: 'Size',
    warranty: 'Warranty',
    months: 'months',
    ask: 'Ask',
    empty: 'No batteries in stock right now — message us on WhatsApp and we source yours within a day.',
  },
  tech: {
    eyebrow: 'Technology guide',
    heading: 'SMF, EFB or AGM — in one look',
    columns: [
      {
        name: 'SMF',
        full: 'SEALED MAINTENANCE-FREE',
        text: 'The standard flooded lead-acid battery, sealed so you never top it up. Honest, affordable tech for cars without start-stop.',
        cycles: 4,
        verdictOk: false,
        verdict: 'Start-stop: will fail within months',
      },
      {
        name: 'EFB',
        full: 'ENHANCED FLOODED',
        text: 'Flooded battery with reinforced plates that survive frequent restarts. The sensible upgrade for basic start-stop cars and heavy city traffic.',
        cycles: 7,
        verdictOk: true,
        verdict: 'Start-stop: yes — entry systems',
      },
      {
        name: 'AGM',
        full: 'ABSORBENT GLASS MAT',
        text: 'Acid held in glass-mat separators: highest starting power, deep-cycle tolerance, spill-proof. Required by premium start-stop and regenerative braking.',
        cycles: 12,
        verdictOk: true,
        verdict: 'Start-stop: yes — required spec',
      },
    ],
    startStopTitle: 'Is your car start-stop?',
    startStopText: 'If the engine cuts at red lights and restarts when you release the brake — it is. Fitting a conventional SMF battery to a start-stop car kills it within months and can void the warranty. When in doubt, send us the VIN and we check.',
    anatomyEyebrow: 'Read your battery',
    anatomyHeading: 'Everything the counter needs is on the label',
    anatomy: [
      { title: 'Capacity — Ah', text: 'Ampere-hours: how much charge the battery stores. Match or exceed the old value.' },
      { title: 'CCA — cold cranking amps', text: 'Starting power at −18 °C. Higher is fine; lower than the old battery is not.' },
      { title: 'Date code', text: 'Dots mark month and year of production. We sell stock under 12 months old, always.' },
      { title: 'Terminal polarity', text: 'Positive left (L+) or right (R+) — the wrong layout will not reach your car’s cables.' },
    ],
    photoHint: 'Photograph the label and send it on WhatsApp — we decode the rest and quote in one reply.',
    figure: {
      label: 'Diagram of a car battery label: capacity, cold cranking amps, date code and terminal polarity',
      polarity: 'POSITIVE LEFT · L+',
      brand: 'AMPER S60',
      spec: '12V',
      specAh: '60Ah',
      specCca: 'CCA',
      specDin: '540A DIN',
      dims: '242 × 175 × 190 · 14.5 kg',
      dateCode: 'PRODUCTION DATE CODE',
      stateEye: 'STATE EYE',
    },
  },
  why: {
    eyebrow: 'Why AMPER',
    heading: 'A counter you can actually reach',
    items: [
      { title: 'Real stock, real numbers', text: 'The catalog mirrors the shelf. If WhatsApp says 6 units, there are 6 units.' },
      { title: 'Fitment checked before dispatch', text: 'Tray dimensions, terminal polarity and start-stop profile are verified for your VIN — not assumed.' },
      { title: 'Warranty handled in-house', text: 'Claims are tested and swapped here, not shipped to a factory. Replacement within 48 hours of a confirmed fault.' },
      { title: 'Old battery buy-back', text: 'Every dead unit we take off your hands is knocked off the invoice — 20 to 40 ₾ by size.' },
    ],
    photoAlt: 'Fitting bay: technician checking a battery before dispatch',
    photoCaption: 'BAY 2 · FITMENT CHECK BEFORE DISPATCH',
  },
  how: {
    eyebrow: 'How it works',
    heading: 'Message to first start, in three steps',
    steps: [
      { n: '01', title: 'Find', text: 'Use the finder above, or send a photo of the old battery. Either way we get vehicle, code or both.' },
      { n: '02', title: 'Confirm', text: 'An expert re-checks fitment against your VIN, confirms live stock and quotes on your channel of choice — under 15 minutes in working hours.' },
      { n: '03', title: 'Fitted', text: 'Delivery and installation at your address, or pick-up at the counter. Old unit bought back, system tested before we leave.' },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    heading: 'Asked at the counter, answered once',
    items: [
      {
        q: 'What do CCA and Ah actually mean?',
        a: 'Ah is the tank — how much energy is stored. CCA is the pump — how hard the battery can push on a cold morning. A replacement needs at least the old battery’s numbers in both; more Ah is harmless if the tray fits, more CCA is always safe.',
      },
      {
        q: 'My car has start-stop. Which battery do I need?',
        a: 'EFB for basic start-stop systems, AGM where the car also has regenerative braking or a premium start-stop spec (check your manual or send us the VIN). An ordinary SMF battery will lose capacity within months — it is the most common wrong purchase we see.',
      },
      {
        q: 'How long does a battery last in Tbilisi heat?',
        a: 'Heat, not cold, is what ages a battery — and Tbilisi summers are hard on them. Expect 3–4 years from a quality unit. If yours is past three, a free 5-minute test at the counter tells you what winter will do.',
      },
      {
        q: 'Will you take my old battery?',
        a: 'Yes — with every installation, and on its own too. Buy-back pays 20–40 ₾ by size, and dead batteries are recycled properly rather than ending up in a ravine.',
      },
      {
        q: 'I only know the code on my old battery.',
        a: 'That is enough. Type it into the finder’s second tab, or send a photo of the label on WhatsApp — we match the equivalent from current stock and confirm fitment the same hour.',
      },
    ],
  },
  contact: {
    eyebrow: 'Contact · request a quote',
    heading: 'Ask before you buy — it costs nothing',
    name: 'Name',
    phone: 'Phone / WhatsApp',
    phonePlaceholder: '+995 ___ __ __ __',
    vehicle: 'Vehicle — year, make, model',
    vehiclePlaceholder: '2018 VW Passat 1.4 TSI',
    battery: 'Battery / code (if known)',
    batteryPlaceholder: 'AMPER AGM 68',
    channel: 'Preferred channel',
    channels: ['WhatsApp', 'Call', 'Telegram', 'Email'],
    note: 'Note (optional)',
    notePlaceholder: 'Need it fitted today, car sits in Vake.',
    submit: 'Request quote',
    hint: 'No account, no cart, no online payment — a person answers.',
    nameRequired: 'Name is required.',
    phoneRequired: 'Phone or WhatsApp number is required.',
    whatsappTitle: 'WhatsApp — fastest',
    counterTitle: 'Counter line',
    telegramTitle: 'Telegram',
    emailTitle: 'Email',
    facebookTitle: 'Facebook',
    instagramTitle: 'Instagram',
    copyTelegram: 'Copy Telegram handle',
    copyEmail: 'Copy email address',
    copied: 'Copied',
    hoursPrefix: 'Counter hours',
    hoursDays: 'MON–SAT 09:00–19:00',
    hoursMid: ', Sunday closed.',
    hoursWarehouse: 'Warehouse & fitting bays:',
    hoursAddress: '12 Kakheti Hwy, Tbilisi',
    hoursSuffix: '— same-day delivery across the city, Rustavi and Mtskheta.',
  },
  footer: {
    nav: [
      { label: 'Finder', href: '#finder' },
      { label: 'Catalog', href: '#catalog' },
      { label: 'Technology', href: '#tech' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  mbar: { whatsapp: 'WhatsApp', call: 'Call' },
  demoNotice: 'demo_v1 · fictional brand, sample stock and prices. Fitment is always confirmed by our team before installation.',
};
