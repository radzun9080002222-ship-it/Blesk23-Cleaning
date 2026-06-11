import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, Building2, Briefcase, MessageCircle } from 'lucide-react';
import { reachGoal } from '@/lib/metrika';

type ObjectType = 'apartment' | 'house' | 'office';

const MIN_PRICE = 6000;

const calcPrice = (area: number) => {
  if (!area || area < 1) return 0;
  const rate = area >= 100 ? 280 : 300;
  const raw = Math.round(area * rate);
  return Math.max(raw, MIN_PRICE);
};

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

const objectLabels: Record<ObjectType, string> = {
  apartment: 'квартира',
  house: 'дом',
  office: 'офис',
};

const RepairCalculator = () => {
  const [area, setArea] = useState<number>(50);
  const [type, setType] = useState<ObjectType>('apartment');

  const price = useMemo(() => calcPrice(area), [area]);
  const ratePerM2 = area >= 100 ? 280 : 300;
  const isMinimum = price === MIN_PRICE && area * ratePerM2 < MIN_PRICE;

  const waText = encodeURIComponent(
    `Здравствуйте! Считал(а) на сайте уборку после ремонта: ${area} м², ${objectLabels[type]}, примерно ${fmt(price)}. Подскажите ближайшую дату.`
  );
  const waHref = `https://wa.me/79002885255?text=${waText}`;

  const types: { id: ObjectType; label: string; Icon: typeof Home }[] = [
    { id: 'apartment', label: 'Квартира', Icon: Home },
    { id: 'house', label: 'Дом', Icon: Building2 },
    { id: 'office', label: 'Офис', Icon: Briefcase },
  ];

  return (
    <div className="rounded-3xl bg-white border border-[#DDEBE8] p-6 md:p-8 shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)]">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3 text-[#0D4D49]">Тип объекта</label>
            <div className="grid grid-cols-3 gap-2">
              {types.map(({ id, label, Icon }) => {
                const active = type === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setType(id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                      active
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-[#DDEBE8] text-[#0D4D49] hover:border-primary/40'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="area" className="text-sm font-medium text-[#0D4D49]">
                Площадь, м²
              </label>
              <Input
                id="area"
                type="number"
                min={20}
                max={500}
                value={area}
                onChange={(e) => setArea(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
                className="w-24 h-9 text-right"
              />
            </div>
            <input
              type="range"
              min={20}
              max={300}
              step={1}
              value={Math.min(300, Math.max(20, area))}
              onChange={(e) => setArea(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Площадь в квадратных метрах"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>20 м²</span>
              <span>300 м²</span>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-2xl bg-[#F7FAF9] border border-[#DDEBE8] p-6 flex flex-col">
          <span className="text-sm text-muted-foreground">Примерная стоимость</span>
          <span className="font-heading text-4xl md:text-5xl font-bold text-primary mt-1">
            {fmt(price)}
          </span>
          <span className="text-xs text-muted-foreground mt-2">
            {isMinimum
              ? 'Минимальная стоимость выезда — 6 000 ₽'
              : `${ratePerM2} ₽/м² × ${area} м²`}
          </span>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Окна после ремонта считаются отдельно — от 750 ₽ за створку. Точную цену
            зафиксируем в WhatsApp за 2 минуты.
          </p>

          <Button
            asChild
            size="lg"
            className="mt-5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white shadow-md"
          >
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => reachGoal('messenger_click')}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Зафиксировать цену в WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RepairCalculator;
