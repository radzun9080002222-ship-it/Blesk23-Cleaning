import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, Building2, Briefcase, MessageCircle, Send } from 'lucide-react';
import maxIcon from '@/assets/max-icon.webp';

const MIN_PRICE = 6000;

const calcPrice = (area: number) => {
  if (!area || area < 1) return 0;
  const rate = area >= 100 ? 280 : 300;
  const raw = Math.round(area * rate);
  return Math.max(raw, MIN_PRICE);
};

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

const RepairCalculator = () => {
  const [area, setArea] = useState<number>(50);
  const [showMessengers, setShowMessengers] = useState(false);

  const price = useMemo(() => calcPrice(area), [area]);
  const ratePerM2 = area >= 100 ? 280 : 300;
  const isMinimum = price === MIN_PRICE && area * ratePerM2 < MIN_PRICE;

  const waText = encodeURIComponent(
    `Здравствуйте! Считал(а) на сайте уборку после ремонта: ${area} м², примерно ${fmt(price)}. Подскажите ближайшую дату.`
  );
  const waHref = `https://wa.me/79002885255?text=${waText}`;
  const tgHref = 'https://t.me/+79002885255';
  const maxHref =
    'https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk';

  return (
    <div className="rounded-3xl bg-white border border-[#DDEBE8] p-6 md:p-8 shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)]">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Inputs */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3 text-[#0D4D49]">
              Считаем для любых объектов
            </label>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#0D4D49]">
              <span className="inline-flex items-center gap-1.5">
                <Home className="w-4 h-4 text-primary" /> Квартиры
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" /> Дома
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" /> Офисы
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Цена зависит только от площади — тип объекта не влияет.
            </p>
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
          <span className="text-sm text-muted-foreground">Точная стоимость</span>
          <span className="font-heading text-4xl md:text-5xl font-bold text-primary mt-1">
            {fmt(price)}
          </span>
          <span className="text-xs text-muted-foreground mt-2">
            {isMinimum
              ? 'Минимальная стоимость выезда — 6 000 ₽'
              : `${ratePerM2} ₽/м² × ${area} м²`}
          </span>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Окна после ремонта считаются отдельно — от 750 ₽ за створку. Зафиксируем
            цену в мессенджере за 2 минуты.
          </p>

          {!showMessengers ? (
            <Button
              type="button"
              size="lg"
              onClick={() => setShowMessengers(true)}
              className="mt-5 rounded-xl hero-gradient text-white font-semibold shadow-md"
            >
              Зафиксировать цену
            </Button>
          ) : (
            <div className="mt-5 space-y-2">
              <Button
                asChild
                size="lg"
                className="w-full rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white"
              >
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  WhatsApp
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                className="w-full rounded-xl bg-[#229ED9] hover:bg-[#1d8dc2] text-white"
              >
                <a
                  href={tgHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Telegram
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full rounded-xl border-[#DDEBE8]"
              >
                <a
                  href={maxHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={maxIcon} alt="Max" className="w-5 h-5 rounded mr-2" />
                  Max
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepairCalculator;
