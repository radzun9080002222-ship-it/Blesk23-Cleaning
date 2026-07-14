import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { usePricingConfig } from '@/hooks/usePricingConfig';

export type FurnitureItem = {
  id: string;
  name: string;
  price: number;
};

export const FURNITURE_ITEMS: FurnitureItem[] = [
  { id: 'sofa2', name: 'Диван двухместный', price: 4000 },
  { id: 'sofa3', name: 'Диван трёхместный', price: 5500 },
  { id: 'sofa_corner', name: 'Диван угловой', price: 7500 },
  { id: 'sofa_slide', name: 'Выдвижное место дивана', price: 800 },
  { id: 'pillow', name: 'Подушка', price: 400 },
  { id: 'mattress', name: 'Матрас (одна сторона)', price: 2800 },
  { id: 'armchair', name: 'Кресло', price: 1500 },
  { id: 'chair', name: 'Стул', price: 500 },
  { id: 'headboard', name: 'Изголовье кровати', price: 1500 },
  { id: 'pouf', name: 'Пуф', price: 550 },
  { id: 'bench', name: 'Банкетка', price: 1200 },
  { id: 'carseat', name: 'Автокресло', price: 1500 },
  { id: 'stroller', name: 'Коляска детская', price: 2500 },
];

export const FURNITURE_MINIMUM = 4000;

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

type Props = {
  counts: Record<string, number>;
  setCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onFix: () => void;
};

const FurnitureCalculator = ({ counts, setCounts, onFix }: Props) => {
  const pricing = usePricingConfig();
  const items = useMemo(
    () => FURNITURE_ITEMS.map((item) => ({ ...item, price: pricing.dry[item.id] || item.price })),
    [pricing]
  );
  const rawTotal = useMemo(
    () => items.reduce((sum, item) => sum + (counts[item.id] || 0) * item.price, 0),
    [counts, items]
  );
  const total = rawTotal > 0 ? Math.max(rawTotal, FURNITURE_MINIMUM) : 0;

  const inc = (id: string) =>
    setCounts((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));

  return (
    <div className="rounded-3xl bg-white border border-[#DDEBE8] p-5 md:p-7 shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)]">
      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        {/* items */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2">
          {items.map((it) => {
            const n = counts[it.id] || 0;
            return (
              <div
                key={it.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                  n > 0
                    ? 'border-primary/50 bg-[#F7FAF9]'
                    : 'border-[#DDEBE8] bg-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#0D4D49] truncate">
                    {it.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    от {fmt(it.price)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => dec(it.id)}
                    disabled={n === 0}
                    aria-label={`Уменьшить: ${it.name}`}
                    className="w-8 h-8 rounded-full border border-[#DDEBE8] flex items-center justify-center text-[#0D4D49] disabled:opacity-30 hover:border-primary/50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-semibold tabular-nums">
                    {n}
                  </span>
                  <button
                    type="button"
                    onClick={() => inc(it.id)}
                    aria-label={`Добавить: ${it.name}`}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* total */}
        <div className="rounded-2xl bg-[#F7FAF9] border border-[#DDEBE8] p-5 flex flex-col self-start md:sticky md:top-24">
          <span className="text-sm text-muted-foreground">
            Стоимость по прайсу
          </span>
          <span className="font-heading text-3xl md:text-4xl font-bold text-primary mt-1">
            {fmt(total)}
          </span>
          <span className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {rawTotal === 0 || rawTotal < FURNITURE_MINIMUM
              ? `Минимальный выезд — ${fmt(FURNITURE_MINIMUM)}`
              : 'Зафиксируем сумму в заявке до выезда мастера.'}
          </span>
          <Button
            type="button"
            size="lg"
            onClick={onFix}
            disabled={total === 0}
            className="mt-5 rounded-xl hero-gradient text-white font-semibold shadow-md disabled:opacity-60"
          >
            Перейти к заявке
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FurnitureCalculator;
