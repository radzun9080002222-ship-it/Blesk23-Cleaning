import { useMemo, useState } from 'react';
import {
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConsentCheckbox from '@/components/ConsentCheckbox';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { submitGoogleLead } from '@/lib/googleForms';
import { appendLeadTracking } from '@/lib/leadTracking';
import { reachGoal } from '@/lib/metrika';
import { rateForPricing, type CleaningType } from '@/lib/pricing';

type PublicCleaningType = Exclude<CleaningType, 'all_inclusive'>;

type Props = {
  mode?: 'all' | 'repair';
  sectionId?: string;
};

const cleaningLabels: Record<PublicCleaningType, string> = {
  wet: 'Влажная',
  general: 'Генеральная',
  repair: 'После ремонта',
};

const cleaningDescriptions: Record<PublicCleaningType, string> = {
  wet: 'Поддерживающая уборка поверхностей и пола',
  general: 'Глубокая уборка всей квартиры или дома',
  repair: 'Удаление строительной пыли и следов ремонта',
};

const dirtOptions = [
  { value: 1, label: 'Обычное', description: 'Регулярная уборка' },
  { value: 1.5, label: 'Сильное', description: 'Много пыли и жира' },
  { value: 2, label: 'Очень сильное', description: 'Застарелые загрязнения' },
] as const;

const windowItems = [
  { id: 'panoramic', label: 'Панорамная створка' },
  { id: 'standard', label: 'Стандартная створка' },
  { id: 'mini', label: 'Мини-окно' },
  { id: 'balconyDoor', label: 'Балконная дверь' },
] as const;

const extraItems = [
  { id: 'fridge', label: 'Холодильник внутри', unit: 'шт.' },
  { id: 'fridge2', label: 'Двухкамерный холодильник', unit: 'шт.' },
  { id: 'oven', label: 'Духовой шкаф внутри', unit: 'шт.' },
  { id: 'microwave', label: 'Микроволновка', unit: 'шт.' },
  { id: 'hood', label: 'Вытяжка', unit: 'шт.' },
  { id: 'kitchen_cabinet', label: 'Кухонный шкаф внутри', unit: 'шт.' },
  { id: 'curtains_wash', label: 'Постирать и повесить шторы', unit: 'окно' },
  { id: 'curtains_iron', label: 'Погладить шторы', unit: 'окно' },
  { id: 'ironing', label: 'Глажка белья', unit: 'час' },
  { id: 'linen', label: 'Смена постельного белья', unit: 'раз' },
  { id: 'chandelier', label: 'Люстра обычная', unit: 'шт.' },
  { id: 'chandelier_big', label: 'Люстра большая', unit: 'шт.' },
  { id: 'ac', label: 'Сетка кондиционера', unit: 'шт.' },
  { id: 'seams', label: 'Швы отпаривателем', unit: 'комната' },
] as const;

const fmt = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '').replace(/^8/, '7').slice(0, 11);
  const normalized = digits.startsWith('7') ? digits : `7${digits}`;
  const area = normalized.slice(1, 4);
  const first = normalized.slice(4, 7);
  const second = normalized.slice(7, 9);
  const third = normalized.slice(9, 11);
  let result = '+7';
  if (area) result += ` (${area}`;
  if (area.length === 3) result += ')';
  if (first) result += ` ${first}`;
  if (second) result += `-${second}`;
  if (third) result += `-${third}`;
  return result;
};

const Counter = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) => (
  <div className="flex items-center gap-2 shrink-0">
    <button
      type="button"
      onClick={() => onChange(Math.max(0, value - 1))}
      disabled={value === 0}
      aria-label={`Уменьшить: ${label}`}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DDEBE8] text-[#0D4D49] transition-colors hover:border-primary/50 disabled:opacity-30"
    >
      <Minus className="h-4 w-4" />
    </button>
    <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
    <button
      type="button"
      onClick={() => onChange(value + 1)}
      aria-label={`Добавить: ${label}`}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <Plus className="h-4 w-4" />
    </button>
  </div>
);

const PublicCleaningCalculator = ({ mode = 'all', sectionId = 'price-calculator' }: Props) => {
  const pricing = usePricingConfig();
  const [type, setType] = useState<PublicCleaningType>(mode === 'repair' ? 'repair' : 'general');
  const [area, setArea] = useState(50);
  const [dirt, setDirt] = useState<number>(1);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [windows, setWindows] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [wardrobe, setWardrobe] = useState(0);
  const [windowFilm, setWindowFilm] = useState(false);
  const [mold, setMold] = useState(false);
  const [polyana, setPolyana] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const isRepair = type === 'repair';

  const calculation = useMemo(() => {
    const lines: { label: string; sum: number }[] = [];
    const rate = rateForPricing(pricing, type, area);
    const baseRaw = area > 0 ? Math.round(area * rate * dirt) : 0;
    const base = area > 0 ? Math.max(baseRaw, pricing.minOrder) : 0;

    if (base > 0) {
      lines.push({
        label: `${cleaningLabels[type]} уборка, ${area} м²${dirt > 1 ? `, загрязнение ×${dirt}` : ''}`,
        sum: base,
      });
    }

    windowItems.forEach((item) => {
      const count = windows[item.id] || 0;
      if (!count) return;
      const price = pricing.windows[item.id][isRepair ? 'repair' : 'usual'];
      const filmMultiplier = isRepair && windowFilm ? 2 : 1;
      lines.push({
        label: `${item.label} × ${count}${filmMultiplier > 1 ? ', строительная плёнка' : ''}`,
        sum: count * price * filmMultiplier,
      });
    });

    extraItems.forEach((item) => {
      const count = extras[item.id] || 0;
      if (!count) return;
      lines.push({
        label: `${item.label} × ${count}`,
        sum: count * (pricing.extras[item.id] || 0),
      });
    });

    if (wardrobe > 0) lines.push({ label: 'Шкафы и комоды внутри', sum: wardrobe });
    if (mold) lines.push({ label: 'Обработка плесени', sum: pricing.special.mold });
    if (polyana) lines.push({ label: 'Выезд на Красную Поляну', sum: pricing.special.polyana });

    return {
      lines,
      rate,
      total: lines.reduce((sum, line) => sum + line.sum, 0),
      minimumApplied: base > baseRaw,
    };
  }, [area, dirt, extras, isRepair, mold, polyana, pricing, type, wardrobe, windowFilm, windows]);

  const phoneDigits = phone.replace(/\D/g, '');
  const formValid = name.trim().length >= 2 && phoneDigits.length >= 10 && phoneDigits.length <= 15 && consent && calculation.total > 0;
  const formName = mode === 'repair' ? 'repair_public_calculator' : 'main_public_calculator';

  const setCount = (
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    id: string,
    value: number
  ) => setter((current) => ({ ...current, [id]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === 'sending') return;
    if (!formValid) { setStatus('error'); return; }

    const serviceSummary = calculation.lines
      .map((line) => `• ${line.label} — ${fmt(line.sum)}`)
      .join('\n');
    const leadName = `Калькулятор: ${cleaningLabels[type]}, ${area} м²`;
    const customerMessage = [
      `Заявка из калькулятора на сайте «Империя Блеска»`,
      '',
      serviceSummary,
      '',
      `ИТОГО: ${fmt(calculation.total)}`,
      'Цена рассчитана и зафиксирована до начала работ.',
    ].join('\n');
    const technical = [
      'event_kind: internal_calc',
      `calc_origin: ${formName}`,
      `calc_price: ${calculation.total}`,
      `calc_lead_name: ${leadName}`,
      `calc_type: ${type}`,
      `calc_area: ${area}`,
      `calc_created_at: ${new Date().toISOString()}`,
    ].join('\n');

    try {
      setStatus('sending');
      await submitGoogleLead({
        name: name.trim(),
        phone,
        message: `${appendLeadTracking(customerMessage)}\n${technical}`,
      });
      reachGoal('form_submit', { form: formName, calc_type: type, calc_price: calculation.total });
      reachGoal('calculator_submit', { form: formName, calc_type: type, calc_price: calculation.total });
      setStatus('success');
    } catch {
      reachGoal('form_error', { form: formName });
      setStatus('error');
    }
  };

  return (
    <section id={sectionId} className="relative overflow-hidden bg-[#003F3B] py-16 text-white md:py-24">
      <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top_right,#21a99a_0,transparent_45%)]" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-9 max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-[#8CE5D7]">
            <ShieldCheck className="h-4 w-4" />
            Цена известна до приезда команды
          </span>
          <h2 className="font-heading text-3xl font-bold leading-tight md:text-5xl">
            Сколько будет стоить моя уборка?
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
            Считаем по открытому прайсу и фиксируем сумму в заявке. На объекте она не вырастет:
            никаких внезапных доплат после приезда клинеров.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-white/85">
            {['Фиксируем цену в заявке', 'Без доплат на месте', 'Свяжемся за 5 минут'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <Check className="h-4 w-4 text-[#62D5C4]" /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.25fr_.75fr] lg:items-start">
          <div className="rounded-3xl bg-white p-5 text-[#0D4D49] shadow-2xl md:p-8">
            {mode === 'all' && (
              <div className="mb-7">
                <p className="mb-3 text-sm font-semibold">Выберите уборку</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(cleaningLabels) as PublicCleaningType[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setType(item);
                        if (item !== 'repair') setWindowFilm(false);
                      }}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        type === item
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                          : 'border-[#DDEBE8] hover:border-primary/40'
                      }`}
                    >
                      <span className="block text-sm font-bold">{cleaningLabels[item]}</span>
                      <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                        {cleaningDescriptions[item]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <label htmlFor={`${sectionId}-area`} className="text-sm font-semibold">Площадь, м²</label>
                  <Input
                    id={`${sectionId}-area`}
                    type="number"
                    min={20}
                    max={500}
                    value={area}
                    onChange={(event) => setArea(Math.max(0, Math.min(500, Number(event.target.value) || 0)))}
                    className="h-10 w-24 text-right font-semibold"
                  />
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={Math.min(300, Math.max(20, area))}
                  onChange={(event) => setArea(Number(event.target.value))}
                  aria-label="Площадь помещения"
                  className="w-full accent-primary"
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>20 м²</span><span>300 м²</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ставка по вашему объёму: {calculation.rate} ₽/м²
                </p>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold">Степень загрязнения</p>
                <div className="space-y-2">
                  {dirtOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDirt(option.value)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                        dirt === option.value ? 'border-primary bg-primary/10' : 'border-[#DDEBE8]'
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{option.description}</span>
                      </span>
                      {dirt === option.value && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 border-t border-[#DDEBE8] pt-5">
              <button
                type="button"
                onClick={() => setExtrasOpen((open) => !open)}
                aria-expanded={extrasOpen}
                className="flex w-full items-center justify-between rounded-2xl bg-[#F3F8F7] px-4 py-3 text-left font-semibold"
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Добавить окна и дополнительные услуги
                </span>
                <ChevronDown className={`h-5 w-5 transition-transform ${extrasOpen ? 'rotate-180' : ''}`} />
              </button>

              {extrasOpen && (
                <div className="mt-4 space-y-6">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">Окна</h3>
                      {isRepair && (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={windowFilm}
                            onChange={(event) => setWindowFilm(event.target.checked)}
                            className="accent-primary"
                          />
                          Есть строительная плёнка
                        </label>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {windowItems.map((item) => {
                        const price = pricing.windows[item.id][isRepair ? 'repair' : 'usual'];
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#DDEBE8] p-3">
                            <div>
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{fmt(price)} / створка</p>
                            </div>
                            <Counter
                              label={item.label}
                              value={windows[item.id] || 0}
                              onChange={(value) => setCount(setWindows, item.id, value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-bold">Дополнительные услуги</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {extraItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#DDEBE8] p-3">
                          <div>
                            <p className="text-sm font-medium leading-snug">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{fmt(pricing.extras[item.id])} / {item.unit}</p>
                          </div>
                          <Counter
                            label={item.label}
                            value={extras[item.id] || 0}
                            onChange={(value) => setCount(setExtras, item.id, value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#DDEBE8] p-3">
                      <p className="mb-2 text-sm font-medium">Шкафы и комоды внутри</p>
                      <div className="flex flex-wrap gap-2">
                        {[0, ...pricing.wardrobe].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setWardrobe(value)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                              wardrobe === value ? 'border-primary bg-primary/10 text-primary' : 'border-[#DDEBE8]'
                            }`}
                          >
                            {value === 0 ? 'Не нужно' : `+${fmt(value)}`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-[#DDEBE8] p-3 text-sm">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={mold} onChange={(event) => setMold(event.target.checked)} className="accent-primary" />
                        Обработка плесени (+{fmt(pricing.special.mold)})
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={polyana} onChange={(event) => setPolyana(event.target.checked)} className="accent-primary" />
                        Выезд на Красную Поляну (+{fmt(pricing.special.polyana)})
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 text-[#0D4D49] shadow-2xl md:p-7 lg:sticky lg:top-24">
            {status === 'success' ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
                <h3 className="mt-4 font-heading text-2xl font-bold">Цена зафиксирована</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Расчёт уже у Ферузы. Свяжемся с вами в течение 5 минут и согласуем дату.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-[#F3F8F7] p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Calculator className="h-4 w-4" /> Ваш расчёт
                  </div>
                  <div className="mt-2 font-heading text-4xl font-bold text-[#0D4D49] md:text-5xl">
                    {fmt(calculation.total)}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {calculation.minimumApplied
                      ? `Учтён минимальный заказ ${fmt(pricing.minOrder)}`
                      : 'Итог уже включает выбранные услуги'}
                  </p>
                  <div className="mt-4 max-h-40 space-y-2 overflow-y-auto border-t border-[#DDEBE8] pt-3">
                    {calculation.lines.map((line) => (
                      <div key={line.label} className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">{line.label}</span>
                        <span className="shrink-0 font-semibold">{fmt(line.sum)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={submit} data-track-form={formName} className="mt-5 space-y-3">
                  <div>
                    <h3 className="font-heading text-xl font-bold">Зафиксировать цену</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Оставьте имя и телефон — свяжемся в течение 5 минут.
                    </p>
                  </div>
                  <Input
                    name="name"
                    aria-label="Ваше имя"
                    placeholder="Ваше имя"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    required
                    className="h-12 rounded-xl"
                  />
                  <Input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    aria-label="Телефон"
                    placeholder="+7 (___) ___-__-__"
                    value={phone}
                    onChange={(event) => setPhone(formatPhone(event.target.value))}
                    required
                    className="h-12 rounded-xl"
                  />
                  <ConsentCheckbox id={`${sectionId}-consent`} checked={consent} onChange={setConsent} />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={status === 'sending'}
                    className="h-12 w-full rounded-xl hero-gradient font-semibold text-white"
                  >
                    {status === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
                  </Button>
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    Зафиксируем рассчитанную цену и свяжемся в течение 5 минут.
                  </p>
                  {status === 'error' && (
                    <p className="text-center text-xs text-destructive">
                      Не отправилось. Проверьте имя и телефон и поставьте галочку согласия ниже — или позвоните нам.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PublicCleaningCalculator;
