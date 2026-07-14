import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { mergePricing, PRICING_DEFAULTS, type PricingConfig } from '@/lib/pricing';

export const usePricingConfig = () => {
  const [pricing, setPricing] = useState<PricingConfig>(PRICING_DEFAULTS);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('pricing_config')
          .select('data')
          .eq('id', 'default')
          .maybeSingle();
        if (!cancelled && !error && data?.data) setPricing(mergePricing(data.data));
      } catch {
        // Резервный прайс уже находится в состоянии.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return pricing;
};
