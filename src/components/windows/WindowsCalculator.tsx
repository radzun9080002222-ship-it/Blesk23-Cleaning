import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

export type WindowTariff = 'general' | 'repair';

export type WindowItem = {
  id: string;
  name: string;
  prices: Record<WindowTariff, number>;
};

export const WINDOW_ITEMS: WindowItem[] = [
  { id: 'panoramic', name: 'Панорамная створка (в пол)', prices: { general: 1200, repair: 2000 } },
  { id: 'standard', name: 'Стандартная створка', prices: { general: 500, repair: 750 } },
  { id: 'mini', name: 'Мини-окно', prices: { general: 400, repair: 500 } },
  { id: 'balcony_door', name: 'Балконная дверь', prices: { general: 1200, repair: 1500 } },
];

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

type Props = {
  counts: Record<string, number>;
  setCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  tariff: WindowTariff;
  setTariff: (t: WindowTariff) => void;
  film: boolean;
  setFilm: (v: boolean) => void;
  onFix: () => void;
};

export const calcTotal = (
  counts: Record<string, number>,
  tariff: WindowTariff,
  film: boolean,
) => {
  const base = WINDOW_ITEMS.reduce(
    (s, it) => s + (counts[it.id] || 0) * it.prices[tariff],
    0,
  );
  return tariff === 'repair' && film ? base * 2 : base;
};

const WindowsCalculator = ({
  counts, setCounts, tariff, setTariff, film, setFilm, onFix,
}: Props) => {
  const total = useMemo(() => calcTotal(counts, tariff, film), [counts, tariff, film]);

  const inc = (id: string) => setCounts((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) => setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));

  return (
    <div className="rounded-3xl bg-white border border-[#DDEBE8] p-5 md:p-7 shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)]">
      {/* Tariff switch */}
      <div className="mb-5">
        <div className="inline-flex w-full sm:w-auto rounded-xl bg-[#F7FAF9] border border-[#DDEBE8] p-1">
          {([
            { v: 'general', l: 'Генеральная / влажная' },
            { v: 'repair', l: 'После ремонта' },
          ] as { v: WindowTariff; l: string }[]).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setTariff(o.v)}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-semibold transition-colors ${
                tariff === o.v
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-[#0D4D49] hover:text-primary'
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        {/* items */}
        <div className="space-y-2">
          {WINDOW_ITEMS.map((it) => {
            const n = counts[it.id] || 0;
            const price = it.prices[tariff];
            return (
              <div
                key={it.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                  n > 0 ? 'border-primary/50 bg-[#F7FAF9]' : 'border-[#DDEBE8] bg-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#0D4D49] truncate">{it.name}</div>
                  <div className="text-xs text-muted-foreground">от {fmt(price)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => dec(it.id)}
                    disabled={n === 0}
                    aria-label="Убрать"
                    className="w-8 h-8 rounded-full border border-[#DDEBE8] flex items-center justify-center text-[#0D4D49] disabled:opacity-30 hover:border-primary/50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-semibold tabular-nums">{n}</span>
                  <button
                    type="button"
                    onClick={() => inc(it.id)}
                    aria-label="Добавить"
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {tariff === 'repair' && (
            <label className="flex items-start gap-3 p-3 rounded-xl border border-[#DDEBE8] bg-[#F7FAF9] cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={film}
                onChange={(e) => setFilm(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#00796F]"
              />
              <div>
                <div className="text-sm font-medium text-[#0D4D49]">
                  Плёнка на окнах (×2)
                </div>
                <div className="text-xs text-muted-foreground">
                  Снятие защитной плёнки со всех окон — итог умножается на 2.
                </div>
              </div>
            </label>
          )}
        </div>

        {/* total */}
        <div className="rounded-2xl bg-[#F7FAF9] border border-[#DDEBE8] p-5 flex flex-col self-start md:sticky md:top-24">
          <span className="text-sm text-muted-foreground">Примерная стоимость</span>
          <span className="font-heading text-3xl md:text-4xl font-bold text-primary mt-1">
            от {fmt(total)}
          </span>
          <span className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Точная стоимость — после осмотра. Глухие окна с доступом по лестнице — цена под объект.
          </span>
          <Button
            type="button"
            size="lg"
            onClick={onFix}
            disabled={total === 0}
            className="mt-5 rounded-xl hero-gradient text-white font-semibold shadow-md disabled:opacity-60"
          >
            Зафиксировать цену
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WindowsCalculator;
