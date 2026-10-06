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

export interface StockStrings {
  stockIn: string;
  stockCount: string;
  stockLeft: string;
  stockOut: string;
  stockOrder: string;
}

export interface ResultCardStrings extends StockStrings {
  ask: string;
  call: string;
  upgrade: string;
  upgradePrefix: string;
  spec: string;
  warranty: string;
  months: string;
  askForPrice: string;
  noteTech: string;
  noteCapacity: string;
  noteCca: string;
  noteOrder: string;
  noteOut: string;
}

export interface SiteContent {
  brand: { name: string; tld: string };
  skip: string;
  menu: string;
  meta: { title: string; description: string; ogDescription: string };
  switcher: { ka: string; en: string };
  common: { quoteMessage: string };
  nav: { label: string; href: string }[];
  navLabel: string;
  homeLabel: string;
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
    vehicleTab: string;
    codeTab: string;
    searchMethod: string;
    vehicle: {
      typeLabel: string;
      types: { car: string; van: string; truck: string; moto: string };
      year: string;
      yearPlaceholder: string;
      make: string;
      makePlaceholder: string;
      model: string;
      engine: string;
      loading: string;
      emptyOption: string;
    };
    code: { label: string; placeholder: string; submit: string; hint: string };
    results: {
      loading: string;
      error: string;
      retry: string;
      emptyTitle: string;
      emptyText: string;
      whatsapp: string;
      card: ResultCardStrings;
    };
    messages: {
      resultAsk: string;
      vehicleCode: string;
      emptyMatch: string;
      notSureHello: string;
      notSurePhone: string;
      notSureCar: string;
      notSureVin: string;
      notSureNote: string;
      notSurePhoto: string;
    };
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
    filterLabel: string;
    note: string;
    askForPrice: string;
    spec: string;
    dims: string;
    warranty: string;
    months: string;
    ask: string;
    empty: string;
    askMessage: string;
    priceOnRequest: string;
  };
  tech: {
    eyebrow: string;
    heading: string;
    cycleLife: string;
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
    quoteHello: string;
    quoteName: string;
    quotePhone: string;
    quoteVehicle: string;
    quoteBattery: string;
    quoteChannel: string;
    quoteNote: string;
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
  footer: { navLabel: string; nav: { label: string; href: string }[] };
  mbar: { navLabel: string; whatsapp: string; call: string };
  demoNotice: string;
}

export const en: SiteContent = {
  brand: { name: 'AMPER', tld: '.GE' },
  skip: 'Skip to battery finder',
  menu: 'Menu',
  meta: {
    title: 'AMPER.GE — Car batteries in Tbilisi',
    description: 'Find the right car battery by vehicle or old-battery code. Fitment confirmed, same-day delivery and installation in Tbilisi.',
    ogDescription: 'Find the right car battery by vehicle or old-battery code. Same-day delivery and installation.',
  },
  switcher: { ka: 'ქართ', en: 'EN' },
  common: { quoteMessage: 'Hello, I need a car battery. Please send me a quote.' },
  navLabel: 'Main',
  homeLabel: '{brand} — home',
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
    vehicleTab: 'By vehicle',
    codeTab: 'By battery code',
    searchMethod: 'Search method',
    vehicle: {
      typeLabel: 'Vehicle type',
      types: { car: 'Car / SUV', van: 'Van / commercial', truck: 'Truck / bus', moto: 'Motorcycle' },
      year: 'Year',
      yearPlaceholder: 'Year…',
      make: 'Make',
      makePlaceholder: 'Make…',
      model: 'Model',
      engine: 'Engine / fuel',
      loading: 'Loading…',
      emptyOption: '—',
    },
    code: {
      label: 'Code, OEM number, group size, Ah or CCA',
      placeholder: 'e.g. 0 092 S50 080 · L3 · 60Ah · 540A',
      submit: 'Find equivalents',
      hint: 'At least 3 characters — the code printed on the old battery label.',
    },
    results: {
      loading: 'Loading…',
      error: 'Something went wrong, please try again.',
      retry: 'Retry',
      emptyTitle: 'No match found',
      emptyText: 'send us a photo of the old battery on WhatsApp.',
      whatsapp: 'WhatsApp',
      card: {
        ask: 'Ask',
        call: 'Call',
        upgrade: 'Upgrade',
        upgradePrefix: 'Upgrade: ',
        spec: 'Spec',
        warranty: 'Warranty',
        months: 'months',
        askForPrice: 'Ask for price',
        stockIn: 'In stock',
        stockCount: '{n} in stock',
        stockLeft: 'Only {n} left',
        stockOut: 'Out of stock',
        stockOrder: 'Order only',
        noteTech: 'better technology ({tech})',
        noteCapacity: 'more capacity',
        noteCca: 'stronger cold start',
        noteOrder: 'order only',
        noteOut: 'out of stock',
      },
    },
    messages: {
      resultAsk: 'Hello, I am interested in {name} ({ah}Ah {cca}A). My vehicle is: {vehicle}. Please confirm compatibility, availability, price, warranty and installation/delivery options.',
      vehicleCode: 'battery code {code}',
      emptyMatch: 'Hello, I could not find a battery match. I am sending a photo of the old battery label.',
      notSureHello: 'Hello, I am not sure which battery I need.',
      notSurePhone: 'Phone: {v}',
      notSureCar: 'Car: {v}',
      notSureVin: 'VIN: {v}',
      notSureNote: 'What happened: {v}',
      notSurePhoto: 'I will attach a photo of the old battery here.',
    },
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
    filterLabel: 'Filter',
    note: 'Prices include the old-battery buy-back discount when you hand in your old unit. Stock is re-counted every morning; WhatsApp shows live numbers.',
    askForPrice: 'Ask for price',
    spec: 'Spec',
    dims: 'Size',
    warranty: 'Warranty',
    months: 'months',
    ask: 'Ask',
    empty: 'No batteries in stock right now — message us on WhatsApp and we source yours within a day.',
    askMessage: 'Hello, I am interested in {name} ({ah}Ah {cca}A, {price}). Please confirm availability, price, warranty and installation/delivery options.',
    priceOnRequest: 'price on request',
  },
  tech: {
    eyebrow: 'Technology guide',
    heading: 'SMF, EFB or AGM — in one look',
    cycleLife: 'Cycle life',
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
    quoteHello: 'Hello, I would like a battery quote.',
    quoteName: 'Name: {v}',
    quotePhone: 'Phone: {v}',
    quoteVehicle: 'Vehicle: {v}',
    quoteBattery: 'Battery/code: {v}',
    quoteChannel: 'Preferred channel: {v}',
    quoteNote: 'Note: {v}',
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
    navLabel: 'Footer',
    nav: [
      { label: 'Finder', href: '#finder' },
      { label: 'Catalog', href: '#catalog' },
      { label: 'Technology', href: '#tech' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  mbar: { navLabel: 'Quick contact', whatsapp: 'WhatsApp', call: 'Call' },
  demoNotice: 'demo_v1 · fictional brand, sample stock and prices. Fitment is always confirmed by our team before installation.',
};

export const ka: SiteContent = {
  "brand": {
    "name": "AMPER",
    "tld": ".GE"
  },
  "skip": "გადასვლა აკუმულატორის ძიებაზე",
  "menu": "მენიუ",
  "meta": {
    "title": "AMPER.GE — ავტო აკუმულატორები თბილისში",
    "description": "იპოვეთ შესაფერისი ავტო აკუმულატორი მანქანით ან ძველი აკუმულატორის კოდით. შესაბამისობის დადასტურება, მიტანა და მონტაჟი იმავე დღეს თბილისში.",
    "ogDescription": "იპოვეთ შესაფერისი ავტო აკუმულატორი მანქანით ან ძველი აკუმულატორის კოდით. მიტანა და მონტაჟი იმავე დღეს."
  },
  "switcher": {
    "ka": "ქართ",
    "en": "EN"
  },
  "common": {
    "quoteMessage": "გამარჯობა, მჭირდება ავტო აკუმულატორი. გთხოვთ, გამომიგზავნოთ ფასი."
  },
  "navLabel": "მთავარი მენიუ",
  "homeLabel": "{brand} — მთავარი",
  "nav": [
    {
      "label": "ძიება",
      "href": "#finder"
    },
    {
      "label": "კატალოგი",
      "href": "#catalog"
    },
    {
      "label": "ტექნოლოგია",
      "href": "#tech"
    },
    {
      "label": "რატომ ჩვენ",
      "href": "#why"
    },
    {
      "label": "კითხვები",
      "href": "#faq"
    },
    {
      "label": "კონტაქტი",
      "href": "#contact"
    }
  ],
  "hero": {
    "eyebrow": "თბილისი · ავტო აკუმულატორები · 2009 წლიდან",
    "titleA": "სწორი აკუმულატორი.",
    "titleB": "პირველივე ჩართვა.",
    "lede": "მოძებნეთ თქვენი მანქანით ან ძველ აკუმულატორზე დატანილი კოდით. ჩვენ ვადასტურებთ შესაბამისობას, ფასს WhatsApp-ზე გაცნობებთ და იმავე დღეს ვამონტაჟებთ. თქვენს შეკვეთას პირველი შეტყობინებიდან დამონტაჟებამდე ერთი სპეციალისტი უძღვება.",
    "whatsapp": "მოგვწერეთ WhatsApp-ზე",
    "call": "დაგვირეკეთ",
    "facts": [
      "გარანტია 24–48 თვე",
      "შესაბამისობა მოწმდება გაგზავნამდე",
      "მიტანა და მონტაჟი იმავე დღეს"
    ],
    "photoAlt": "AMPER AGM 68 აკუმულატორი სატესტო სადგამზე",
    "photoModel": "AMPER AGM 68",
    "photoTag": "ტესტი №4 812"
  },
  "finder": {
    "eyebrow": "აკუმულატორის ძიება",
    "heading": "სამი გზა სწორ აკუმულატორამდე",
    "disclaimer": "შესაბამისობას ყოველთვის ჩვენი გუნდი ადასტურებს მონტაჟამდე.",
    "vehicleTab": "მანქანით",
    "codeTab": "აკუმულატორის კოდით",
    "searchMethod": "ძიების მეთოდი",
    "vehicle": {
      "typeLabel": "ტრანსპორტის ტიპი",
      "types": {
        "car": "მსუბუქი / ჯიპი",
        "van": "ფურგონი / კომერციული",
        "truck": "სატვირთო / ავტობუსი",
        "moto": "მოტოციკლი"
      },
      "year": "წელი",
      "yearPlaceholder": "წელი…",
      "make": "მარკა",
      "makePlaceholder": "მარკა…",
      "model": "მოდელი",
      "engine": "ძრავა / საწვავი",
      "loading": "იტვირთება…",
      "emptyOption": "—"
    },
    "code": {
      "label": "კოდი, OEM ნომერი, ზომის ჯგუფი, Ah ან CCA",
      "placeholder": "მაგ. 0 092 S50 080 · L3 · 60Ah · 540A",
      "submit": "ანალოგების პოვნა",
      "hint": "მინიმუმ 3 სიმბოლო — ძველი აკუმულატორის ეტიკეტზე დატანილი კოდი."
    },
    "results": {
      "loading": "იტვირთება…",
      "error": "რაღაც შეცდა, გთხოვთ სცადოთ თავიდან.",
      "retry": "თავიდან ცდა",
      "emptyTitle": "შესაბამისობა ვერ მოიძებნა",
      "emptyText": "გამოგვიგზავნეთ ძველი აკუმულატორის ფოტო WhatsApp-ზე.",
      "whatsapp": "WhatsApp",
      "card": {
        "ask": "ჰკითხეთ",
        "call": "დარეკვა",
        "upgrade": "გაუმჯობესება",
        "upgradePrefix": "გაუმჯობესება: ",
        "spec": "მახასიათებლები",
        "warranty": "გარანტია",
        "months": "თვე",
        "askForPrice": "ფასი მოითხოვეთ",
        "stockIn": "მარაგშია",
        "stockCount": "{n} ცალი მარაგშია",
        "stockLeft": "დარჩა მხოლოდ {n}",
        "stockOut": "მარაგში არ არის",
        "stockOrder": "შეკვეთით",
        "noteTech": "უკეთესი ტექნოლოგია ({tech})",
        "noteCapacity": "მეტი ტევადობა",
        "noteCca": "უფრო ძლიერი ცივი სტარტი",
        "noteOrder": "მხოლოდ შეკვეთით",
        "noteOut": "მარაგში არ არის"
      }
    },
    "messages": {
      "resultAsk": "გამარჯობა, მაინტერესებს {name} ({ah}Ah {cca}A). ჩემი მანქანა: {vehicle}. გთხოვთ, დამიდასტუროთ შესაბამისობა, ხელმისაწვდომობა, ფასი, გარანტია და მიტანა/მონტაჟის პირობები.",
      "vehicleCode": "აკუმულატორის კოდი {code}",
      "emptyMatch": "გამარჯობა, შესაბამისი აკუმულატორი ვერ ვიპოვე. ვგზავნი ძველი აკუმულატორის ეტიკეტის ფოტოს.",
      "notSureHello": "გამარჯობა, არ ვარ დარწმუნებული, რომელი აკუმულატორი მჭირდება.",
      "notSurePhone": "ტელეფონი: {v}",
      "notSureCar": "მანქანა: {v}",
      "notSureVin": "VIN: {v}",
      "notSureNote": "რა მოხდა: {v}",
      "notSurePhoto": "აქვე მივამაგრებ ძველი აკუმულატორის ფოტოს."
    },
    "notSure": {
      "tab": "არ ვარ დარწმუნებული — გამოგზავნეთ ფოტო",
      "phone": "ტელეფონი / WhatsApp",
      "phonePlaceholder": "+995 ___ __ __ __",
      "car": "მანქანა (წელი, მარკა, მოდელი)",
      "carPlaceholder": "2018 VW Passat 1.4 TSI",
      "vin": "VIN (სურვილისამებრ)",
      "note": "რა მოხდა?",
      "notePlaceholder": "დილით არ ირთვება. დაფაზე წერია, რომ start-stop მიუწვდომელია.",
      "submit": "გაუგზავნეთ სალაროს",
      "hint": "სპეციალისტი სამუშაო საათებში WhatsApp-ზე გიპასუხებთ — ჩვეულებრივ 15 წუთში.",
      "phoneRequired": "ტელეფონის ნომერი აუცილებელია, რომ დაგიკავშირდეთ.",
      "carRequired": "მიუთითეთ მანქანა, რომ შესაფერისი აკუმულატორი შევარჩიოთ."
    }
  },
  "catalog": {
    "eyebrow": "კატალოგი",
    "heading": "ამ კვირის აკუმულატორები",
    "chips": [
      {
        "id": "all",
        "label": "ყველა"
      },
      {
        "id": "car",
        "label": "მსუბუქი"
      },
      {
        "id": "truck",
        "label": "სატვირთო"
      },
      {
        "id": "moto",
        "label": "მოტო"
      },
      {
        "id": "deep",
        "label": "ღრმა განმუხტვის"
      },
      {
        "id": "SMF",
        "label": "SMF"
      },
      {
        "id": "EFB",
        "label": "EFB"
      },
      {
        "id": "AGM",
        "label": "AGM"
      }
    ],
    "filterLabel": "ფილტრი",
    "note": "ფასში გათვალისწინებულია ძველი აკუმულატორის გამოსყიდვის ფასდაკლება, როცა ძველს გადმოგვცემთ. მარაგი ყოველ დილით თავიდან ითვლება; ზუსტი რაოდენობა WhatsApp-ზე გეცოდინებათ.",
    "askForPrice": "ფასი მოითხოვეთ",
    "spec": "მახასიათებლები",
    "dims": "ზომა",
    "warranty": "გარანტია",
    "months": "თვე",
    "ask": "ჰკითხეთ",
    "empty": "ამჟამად მარაგში აკუმულატორი არ არის — მოგვწერეთ WhatsApp-ზე და ერთ დღეში შეგიკვეთავთ.",
    "askMessage": "გამარჯობა, მაინტერესებს {name} ({ah}Ah {cca}A, {price}). გთხოვთ, დამიდასტუროთ ხელმისაწვდომობა, ფასი, გარანტია და მიტანა/მონტაჟის პირობები.",
    "priceOnRequest": "ფასი მოთხოვნით"
  },
  "tech": {
    "eyebrow": "ტექნოლოგიების გზამკვლევი",
    "heading": "SMF, EFB თუ AGM — ერთი შეხედვით",
    "cycleLife": "ციკლების რაოდენობა",
    "columns": [
      {
        "name": "SMF",
        "full": "ჰერმეტული, მოვლის გარეშე",
        "text": "სტანდარტული მჟავა-ტყვიის აკუმულატორი, რომელიც ისეა დახურული, რომ დამატება არ სჭირდება. პატიოსანი და ხელმისაწვდომი ტექნოლოგია start-stop-ის გარეშე მანქანებისთვის.",
        "cycles": 4,
        "verdictOk": false,
        "verdict": "Start-stop: რამდენიმე თვეში გაფუჭდება"
      },
      {
        "name": "EFB",
        "full": "გაძლიერებული თხევადი",
        "text": "თხევადი აკუმულატორი გამაგრებული ფირფიტებით, რომლებიც ხშირ ხელახალ ჩართვას უძლებს. გონივრული არჩევანია მარტივი start-stop-ისა და ქალაქის მძიმე საცობებისთვის.",
        "cycles": 7,
        "verdictOk": true,
        "verdict": "Start-stop: დიახ — საბაზო სისტემებისთვის"
      },
      {
        "name": "AGM",
        "full": "მინის ბოჭკოს სეპარატორით",
        "text": "მჟავა მინის ბოჭკოს სეპარატორებშია შენახული: ყველაზე მაღალი სტარტის სიმძლავრე, ღრმა განმუხტვის გამძლეობა, არ იღვრება. სავალდებულოა პრემიუმ start-stop-ისა და რეკუპერაციული დამუხრუჭებისთვის.",
        "cycles": 12,
        "verdictOk": true,
        "verdict": "Start-stop: დიახ — სავალდებულო სპეციფიკაცია"
      }
    ],
    "startStopTitle": "თქვენი მანქანა start-stop-ია?",
    "startStopText": "თუ ძრავა შუქნიშანზე ითიშება და მუხრუჭის გაშვებისას თავისით ირთვება, ესე იგი ასეა. ჩვეულებრივი SMF აკუმულატორი start-stop მანქანაზე რამდენიმე თვეში ფუჭდება და გარანტიასაც კარგავს. თუ დარწმუნებული არ ხართ, გამოგვიგზავნეთ VIN და გადავამოწმებთ.",
    "anatomyEyebrow": "წაიკითხეთ თქვენი აკუმულატორი",
    "anatomyHeading": "ყველაფერი, რაც სალაროს სჭირდება, ეტიკეტზეა",
    "anatomy": [
      {
        "title": "ტევადობა — Ah",
        "text": "ამპერ-საათები: რამდენ მუხტს ინახავს აკუმულატორი. ძველის ტოლი ან მასზე მეტი უნდა იყოს."
      },
      {
        "title": "CCA — ცივი სტარტის დენი",
        "text": "სტარტის სიმძლავრე −18 °C-ზე. მეტი არაუშავს, ძველზე ნაკლები კი არ ივარგებს."
      },
      {
        "title": "წარმოების თარიღის კოდი",
        "text": "წერტილები აჩვენებს წარმოების თვესა და წელს. ჩვენ ყოველთვის 12 თვეზე ახალ მარაგს ვყიდით."
      },
      {
        "title": "პოლუსების განლაგება",
        "text": "პლუსი მარცხნივ (L+) ან მარჯვნივ (R+) — არასწორი განლაგება თქვენი მანქანის კაბელებამდე ვერ მიაღწევს."
      }
    ],
    "photoHint": "გადაუღეთ ეტიკეტს და გამოგვიგზავნეთ WhatsApp-ზე — დანარჩენს ჩვენ ამოვიკითხავთ და ერთ პასუხში გიპასუხებთ ფასით.",
    "figure": {
      "label": "ავტოაკუმულატორის ეტიკეტის სქემა: ტევადობა, ცივი სტარტის დენი, თარიღის კოდი და პოლუსების განლაგება",
      "polarity": "პლუსი მარცხნივ · L+",
      "brand": "AMPER S60",
      "spec": "12V",
      "specAh": "60Ah",
      "specCca": "CCA",
      "specDin": "540A DIN",
      "dims": "242 × 175 × 190 · 14.5 კგ",
      "dateCode": "წარმოების თარიღის კოდი",
      "stateEye": "მდგომარეობის ინდიკატორი"
    }
  },
  "why": {
    "eyebrow": "რატომ AMPER",
    "heading": "სალარო, რომელსაც ნამდვილად დაუკავშირდებით",
    "items": [
      {
        "title": "რეალური მარაგი, რეალური რიცხვები",
        "text": "კატალოგი თაროზე არსებულს ასახავს. თუ WhatsApp-ზე წერია 6 ცალი, 6 ცალი ნამდვილად გვაქვს."
      },
      {
        "title": "შესაბამისობა მოწმდება გაგზავნამდე",
        "text": "ბუდის ზომები, პოლუსების განლაგება და start-stop პროფილი თქვენი VIN-ით მოწმდება და არა ვარაუდობით."
      },
      {
        "title": "გარანტიას ადგილზე ვამუშავებთ",
        "text": "პრეტენზიას ჩვენთან ვამოწმებთ და ვცვლით, ქარხანაში არ ვაგზავნით. დადასტურებული დეფექტის შემთხვევაში შეცვლა 48 საათში."
      },
      {
        "title": "ძველი აკუმულატორის გამოსყიდვა",
        "text": "ყოველი ძველი აკუმულატორი, რომელსაც გვაბარებთ, ინვოისს გამოაკლდება — 20-დან 40 ₾-მდე ზომის მიხედვით."
      }
    ],
    "photoAlt": "სამონტაჟო უბანი: ტექნიკოსი აკუმულატორს ამოწმებს გაგზავნამდე",
    "photoCaption": "უბანი 2 · შესაბამისობის შემოწმება გაგზავნამდე"
  },
  "how": {
    "eyebrow": "როგორ მუშაობს",
    "heading": "შეტყობინებიდან პირველ ჩართვამდე — სამ ნაბიჯში",
    "steps": [
      {
        "n": "01",
        "title": "მოძებნეთ",
        "text": "გამოიყენეთ ზემოთ მოცემული ძიება ან გამოგვიგზავნეთ ძველი აკუმულატორის ფოტო. ორივე შემთხვევაში ვიღებთ მანქანას, კოდს ან ორივეს."
      },
      {
        "n": "02",
        "title": "დაადასტურეთ",
        "text": "სპეციალისტი თქვენი VIN-ით ხელახლა ამოწმებს შესაბამისობას, ადასტურებს მარაგს და თქვენთვის სასურველ არხზე გიგზავნით ფასს — სამუშაო საათებში 15 წუთში."
      },
      {
        "n": "03",
        "title": "დამონტაჟდა",
        "text": "მიტანა და მონტაჟი თქვენს მისამართზე ან გატანა სალაროდან. ძველს ვისყიდით, სისტემას გამოვცდით და მერე ვტოვებთ."
      }
    ]
  },
  "faq": {
    "eyebrow": "ხშირი კითხვები",
    "heading": "რასაც სალაროში გვეკითხებიან — ერთხელ ვუპასუხებთ",
    "items": [
      {
        "q": "რას ნიშნავს CCA და Ah სინამდვილეში?",
        "a": "Ah არის რეზერვუარი — რამდენი ენერგია ინახება. CCA არის ტუმბო — რა ძალით უბიძგებს აკუმულატორი ცივ დილას. შემცვლელს ორივეში ძველის მაჩვენებელი მაინც უნდა ჰქონდეს; მეტი Ah არაფერს აფუჭებს, თუ ბუდეში ეტევა, მეტი CCA კი ყოველთვის უსაფრთხოა."
      },
      {
        "q": "ჩემს მანქანას start-stop აქვს. რომელი აკუმულატორი მჭირდება?",
        "a": "EFB მარტივი start-stop სისტემებისთვის, AGM — როცა მანქანას რეკუპერაციული დამუხრუჭებაც აქვს ან პრემიუმ start-stop სპეციფიკაცია (შეამოწმეთ ინსტრუქცია ან გამოგვიგზავნეთ VIN). ჩვეულებრივი SMF რამდენიმე თვეში ტევადობას კარგავს — ეს ყველაზე ხშირი არასწორი შეძენაა, რასაც ვხვდებით."
      },
      {
        "q": "რამდენ ხანს ძლებს აკუმულატორი თბილისის სიცხეში?",
        "a": "აკუმულატორს სიცივე კი არა, სიცხე ბერავს, თბილისის ზაფხული კი მკაცრია. ხარისხიანი აკუმულატორისგან 3–4 წელი მოელოდეთ. თუ თქვენი სამ წელს გასცდა, სალაროში უფასო 5-წუთიანი ტესტი გეტყვით, რას გიქადით ზამთარი."
      },
      {
        "q": "ჩემს ძველ აკუმულატორს აიღებთ?",
        "a": "დიახ — ყოველ მონტაჟთან ერთად და ცალკეც. გამოსყიდვა ზომის მიხედვით 20–40 ₾-ს იხდის, გამოუსადეგარი აკუმულატორები კი სწორად გადამუშავდება და ხევში არ ამოჰყოფს თავს."
      },
      {
        "q": "მხოლოდ ძველ აკუმულატორზე დატანილი კოდი ვიცი.",
        "a": "ესეც საკმარისია. ჩაწერეთ ძიების მეორე ჩანართში ან გამოგვიგზავნეთ ეტიკეტის ფოტო WhatsApp-ზე — მიმდინარე მარაგიდან ეკვივალენტს ვარჩევთ და შესაბამისობას იმავე საათში ვადასტურებთ."
      }
    ]
  },
  "contact": {
    "eyebrow": "კონტაქტი · ფასის მოთხოვნა",
    "heading": "იკითხეთ ყიდვამდე — არაფერი ღირს",
    "name": "სახელი",
    "phone": "ტელეფონი / WhatsApp",
    "phonePlaceholder": "+995 ___ __ __ __",
    "vehicle": "მანქანა — წელი, მარკა, მოდელი",
    "vehiclePlaceholder": "2018 VW Passat 1.4 TSI",
    "battery": "აკუმულატორი / კოდი (თუ იცით)",
    "batteryPlaceholder": "AMPER AGM 68",
    "channel": "სასურველი არხი",
    "channels": [
      "WhatsApp",
      "ზარი",
      "Telegram",
      "ელფოსტა"
    ],
    "note": "შენიშვნა (სურვილისამებრ)",
    "notePlaceholder": "დღეს მჭირდება დამონტაჟებული, მანქანა ვაკეშია.",
    "submit": "ფასის მოთხოვნა",
    "hint": "ანგარიშის, კალათისა და ონლაინ გადახდის გარეშე — პასუხობს ადამიანი.",
    "nameRequired": "სახელი აუცილებელია.",
    "phoneRequired": "ტელეფონის ან WhatsApp-ის ნომერი აუცილებელია.",
    "quoteHello": "გამარჯობა, მინდა აკუმულატორის ფასი.",
    "quoteName": "სახელი: {v}",
    "quotePhone": "ტელეფონი: {v}",
    "quoteVehicle": "მანქანა: {v}",
    "quoteBattery": "აკუმულატორი/კოდი: {v}",
    "quoteChannel": "სასურველი არხი: {v}",
    "quoteNote": "შენიშვნა: {v}",
    "whatsappTitle": "WhatsApp — ყველაზე სწრაფი",
    "counterTitle": "სალაროს ხაზი",
    "telegramTitle": "Telegram",
    "emailTitle": "ელფოსტა",
    "facebookTitle": "Facebook",
    "instagramTitle": "Instagram",
    "copyTelegram": "Telegram-ის სახელის კოპირება",
    "copyEmail": "ელფოსტის მისამართის კოპირება",
    "copied": "დაკოპირდა",
    "hoursPrefix": "სალაროს საათები",
    "hoursDays": "ორშ–შაბ 09:00–19:00",
    "hoursMid": ", კვირა დასვენების დღეა.",
    "hoursWarehouse": "საწყობი და სამონტაჟო უბნები:",
    "hoursAddress": "კახეთის გზატკეცილი 12, თბილისი",
    "hoursSuffix": "— მიტანა იმავე დღეს მთელ ქალაქში, რუსთავსა და მცხეთაში."
  },
  "footer": {
    "navLabel": "ქვედა მენიუ",
    "nav": [
      {
        "label": "ძიება",
        "href": "#finder"
      },
      {
        "label": "კატალოგი",
        "href": "#catalog"
      },
      {
        "label": "ტექნოლოგია",
        "href": "#tech"
      },
      {
        "label": "კითხვები",
        "href": "#faq"
      },
      {
        "label": "კონტაქტი",
        "href": "#contact"
      }
    ]
  },
  "mbar": {
    "navLabel": "სწრაფი კონტაქტი",
    "whatsapp": "WhatsApp",
    "call": "დარეკვა"
  },
  "demoNotice": "demo_v1 · გამოგონილი ბრენდი, სანიმუშო მარაგი და ფასები. შესაბამისობას ყოველთვის ჩვენი გუნდი ადასტურებს მონტაჟამდე."
};

export const content = { en, ka };
