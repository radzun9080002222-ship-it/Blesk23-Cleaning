import { describe, expect, it } from 'vitest';
import { mergePricing, PRICING_DEFAULTS, rateForPricing } from '@/lib/pricing';

describe('shared calculator pricing', () => {
  it('uses the correct area bracket for each public cleaning type', () => {
    expect(rateForPricing(PRICING_DEFAULTS, 'wet', 60)).toBe(160);
    expect(rateForPricing(PRICING_DEFAULTS, 'general', 81)).toBe(260);
    expect(rateForPricing(PRICING_DEFAULTS, 'repair', 100)).toBe(280);
  });

  it('merges Supabase values without losing fallback fields', () => {
    const pricing = mergePricing({
      minOrder: 7000,
      dry: { sofa2: 4500 },
    });

    expect(pricing.minOrder).toBe(7000);
    expect(pricing.dry.sofa2).toBe(4500);
    expect(pricing.dry.sofa3).toBe(PRICING_DEFAULTS.dry.sofa3);
    expect(pricing.windows.standard.repair).toBe(750);
  });
});
