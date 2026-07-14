export type CleaningType = 'wet' | 'general' | 'repair' | 'all_inclusive';

// Резервный прайс. Актуальная конфигурация загружается из
// Supabase pricing_config/default, но калькуляторы не должны ломаться без сети.
export const PRICING_DEFAULTS = {
  minOrder: 6000,
  rates: {
    wet: [
      { upTo: 60, price: 160 },
      { upTo: 70, price: 150 },
      { upTo: 80, price: 140 },
      { upTo: 90, price: 130 },
      { upTo: 99, price: 120 },
      { upTo: null as number | null, price: 110 },
    ],
    general: [
      { upTo: 60, price: 280 },
      { upTo: 80, price: 270 },
      { upTo: 99, price: 260 },
      { upTo: null as number | null, price: 250 },
    ],
    repair: [
      { upTo: 99, price: 300 },
      { upTo: null as number | null, price: 280 },
    ],
    allInclusive: 450,
  },
  windows: {
    panoramic: { usual: 1200, repair: 2000 },
    standard: { usual: 500, repair: 750 },
    mini: { usual: 400, repair: 500 },
    balconyDoor: { usual: 1200, repair: 1500 },
  },
  extras: {
    fridge: 900,
    fridge2: 1800,
    oven: 900,
    microwave: 500,
    hood: 700,
    kitchen_cabinet: 250,
    curtains_wash: 1500,
    curtains_iron: 1000,
    ironing: 800,
    linen: 500,
    chandelier: 500,
    chandelier_big: 1500,
    ac: 500,
    seams: 3000,
  } as Record<string, number>,
  dry: {
    sofa2: 4000,
    sofa3: 5500,
    sofa_corner: 7500,
    sofa_slide: 800,
    pillow: 400,
    mattress: 2800,
    armchair: 1500,
    chair: 500,
    headboard: 1500,
    pouf: 550,
    bench: 1200,
    carseat: 1500,
    stroller: 2500,
  } as Record<string, number>,
  wardrobe: [2000, 2500] as number[],
  special: { bathroom: 6000, mold: 1500, polyana: 2000 },
};

export type PricingConfig = typeof PRICING_DEFAULTS;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const mergePricingValue = (fallback: unknown, saved: unknown): unknown => {
  if (Array.isArray(fallback) && Array.isArray(saved)) {
    return fallback.map((item, index) =>
      saved[index] == null ? item : mergePricingValue(item, saved[index])
    );
  }

  if (isRecord(fallback) && isRecord(saved)) {
    const result: Record<string, unknown> = { ...fallback };
    Object.entries(saved).forEach(([key, value]) => {
      if (key in fallback) result[key] = mergePricingValue(fallback[key], value);
    });
    return result;
  }

  return typeof saved === 'number' ? saved : fallback;
};

export const mergePricing = (saved: unknown): PricingConfig =>
  mergePricingValue(PRICING_DEFAULTS, saved) as PricingConfig;

export const rateForPricing = (
  pricing: PricingConfig,
  type: CleaningType,
  area: number
): number => {
  if (type === 'all_inclusive') return pricing.rates.allInclusive;
  const brackets = pricing.rates[type];
  for (const bracket of brackets) {
    if (bracket.upTo == null || area <= bracket.upTo) return bracket.price;
  }
  return brackets[brackets.length - 1].price;
};
