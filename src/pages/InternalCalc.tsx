import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Copy, Check, AlertTriangle, Calculator } from 'lucide-react';

/* ====================== ПРАЙС ====================== */

type CleaningType = 'general' | 'wet' | 'repair' | 'all_inclusive';

const MIN_ORDER = 6000;

const cleaningLabels: Record<CleaningType, string> = {
  general: 'Генеральная',
  wet: 'Влажная',
  repair: 'После ремонта',
  all_inclusive: 'Всё включено',
};

const rateFor = (type: CleaningType, area: number): number => {
  if (type === 'general') {
    if (area <= 60) return 280;
    if (area <= 80) return 270;
    if (area <= 99) return 260;
    return 250;
  }
  if (type === 'wet') {
    if (area <= 60) return 160;
    if (area <= 70) return 150;
    if (area <= 80) return 140;
    if (area <= 90) return 130;
    if (area <= 99) return 120;
    return 110;
  }
  if (type === 'repair') {
    return area <= 99 ? 300 : 280;
  }
  return 450; // всё включено
};

// Окна: [обычная уборка, после ремонта]
const windowPrices = {
  panoramic: { label: 'Панорамная створка (в пол)', usual: 1200, repair: 2000, note: 'обычно 900–1200 / 1500–2000 ₽, правь цену под объект' },
  standard: { label: 'Стандартная створка', usual: 500, repair: 750, note: 'после ремонта дороже при плёнке и сильной грязи' },
  mini: { label: 'Мини-окно', usual: 400, repair: 500 },
  balconyDoor: { label: 'Балконная дверь', usual: 1200, repair: 1500 },
};

const extraServices = [
  { id: 'kitchen_cabinet', label: 'Кухонный шкаф внутри', price: 250, unit: 'шт' },
  { id: 'fridge', label: 'Холодильник внутри', price: 900, unit: 'шт' },
  { id: 'fridge2', label: 'Двухкамерный холодильник', price: 1800, unit: 'шт' },
  { id: 'oven', label: 'Духовой шкаф внутри', price: 900, unit: 'шт' },
  { id: 'microwave', label: 'Микроволновка', price: 500, unit: 'шт' },
  { id: 'hood', label: 'Вытяжка', price: 700, unit: 'шт' },
  { id: 'ironing', label: 'Глажка белья (есть ли утюг у клиента?)', price: 800, unit: 'час' },
  { id: 'curtains_wash', label: 'Шторы: постирать и повесить', price: 1500, unit: 'окно' },
  { id: 'curtains_iron', label: 'Шторы: погладить', price: 1000, unit: 'окно' },
  { id: 'chandelier', label: 'Люстра обычная', price: 500, unit: 'шт' },
  { id: 'chandelier_big', label: 'Люстра большая', price: 1500, unit: 'шт' },
  { id: 'ac', label: 'Кондиционер (сетка)', price: 500, unit: 'шт' },
  { id: 'linen', label: 'Смена белья (за всё)', price: 500, unit: 'раз' },
  { id: 'seams', label: 'Швы отпаривателем', price: 3000, unit: 'комната' },
] as const;

const dryCleaning = [
  { id: 'sofa2', label: 'Диван двухместный', price: 3500 },
  { id: 'sofa3', label: 'Диван трёхместный', price: 5000 },
  { id: 'sofa_corner', label: 'Диван угловой', price: 7500 },
  { id: 'mattress', label: 'Матрас (одна сторона)', price: 2800 },
  { id: 'armchair', label: 'Кресло', price: 1200 },
  { id: 'chair', label: 'Стул', price: 450 },
  { id: 'headboard', label: 'Изголовье кровати', price: 1200 },
  { id: 'pouf', label: 'Пуф', price: 550 },
  { id: 'bench', label: 'Банкетка', price: 1200 },
  { id: 'sofa_slide', label: 'Выдвижное место дивана', price: 800 },
  { id: 'pillow', label: 'Подушка', price: 400 },
  { id: 'carseat', label: 'Автокресло', price: 1500 },
  { id: 'stroller', label: 'Коляска детская', price: 2500 },
] as const;

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

/* ====================== UI-ХЕЛПЕРЫ ====================== */

const Counter = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-1.5">
    <button
      type="button"
      onClick={() => onChange(Math.max(0, value - 1))}
      className="w-7 h-7 rounded-lg border border-[#DDEBE8] flex items-center justify-center hover:border-primary/50 text-[#0D4D49] disabled:opacity-30"
      disabled={value === 0}
    >
      <Minus className="w-3.5 h-3.5" />
    </button>
    <span className={`w-7 text-center text-sm font-semibold ${value > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
      {value}
    </span>
    <button
      type="button"
      onClick={() => onChange(value + 1)}
      className="w-7 h-7 rounded-lg border border-[#DDEBE8] flex items-center justify-center hover:border-primary/50 text-[#0D4D49]"
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl bg-white border border-[#DDEBE8] p-5">
    <h2 className="font-heading font-bold text-[#0D4D49] mb-4">{title}</h2>
    {children}
  </div>
);

/* ====================== СТРАНИЦА ====================== */

const InternalCalc = () => {
  const [type, setType] = useState<CleaningType>('general');
  const [area, setArea] = useState<number>(50);

  const [win, setWin] = useState({ panoramic: 0, standard: 0, mini: 0, balconyDoor: 0 });
  const [panoramicPrice, setPanoramicPrice] = useState<number>(windowPrices.panoramic.usual);

  const [extras, setExtras] = useState<Record<string, number>>({});
  const [wardrobeExtra, setWardrobeExtra] = useState<0 | 2000 | 2500>(0);
  const [dry, setDry] = useState<Record<string, number>>({});

  const [mold, setMold] = useState(false);
  const [polyana, setPolyana] = useState(false);
  const [bathrooms, setBathrooms] = useState(0); // отдельные санузлы без уборки квартиры

  const [copied, setCopied] = useState(false);

  const isRepair = type === 'repair';

  const switchType = (t: CleaningType) => {
    setType(t);
    setPanoramicPrice(t === 'repair' ? windowPrices.panoramic.repair : windowPrices.panoramic.usual);
  };

  const calc = useMemo(() => {
    const lines: { label: string; sum: number }[] = [];

    // Основная уборка
    const rate = rateFor(type, area);
    const baseRaw = area > 0 ? Math.round(area * rate) : 0;
    const base = area > 0 ? Math.max(baseRaw, MIN_ORDER) : 0;
    if (area > 0) {
      lines.push({
        label: `${cleaningLabels[type]} уборка, ${area} м² × ${rate} ₽` + (base > baseRaw ? ' (минималка)' : ''),
        sum: base,
      });
    }

    // Окна
    const wp = (k: keyof typeof windowPrices) =>
      k === 'panoramic' ? panoramicPrice : isRepair ? windowPrices[k].repair : windowPrices[k].usual;
    (Object.keys(windowPrices) as (keyof typeof windowPrices)[]).forEach((k) => {
      const count = win[k];
      if (count > 0) lines.push({ label: `${windowPrices[k].label} × ${count}`, sum: count * wp(k) });
    });

    // Допуслуги
    extraServices.forEach((s) => {
      const count = extras[s.id] || 0;
      if (count > 0) lines.push({ label: `${s.label} × ${count} ${s.unit}`, sum: count * s.price });
    });
    if (wardrobeExtra > 0) lines.push({ label: 'Шкафы/комоды внутри (фикс)', sum: wardrobeExtra });

    // Химчистка
    dryCleaning.forEach((s) => {
      const count = dry[s.id] || 0;
      if (count > 0) lines.push({ label: `Химчистка: ${s.label} × ${count}`, sum: count * s.price });
    });

    // Отдельные санузлы
    if (bathrooms > 0) lines.push({ label: `Отдельный санузел/ванная × ${bathrooms}`, sum: bathrooms * 6000 });

    // Модификаторы
    if (mold) lines.push({ label: 'Обработка плесени', sum: 1500 });
    if (polyana) lines.push({ label: 'Выезд на Красную Поляну', sum: 2000 });

    const total = lines.reduce((a, l) => a + l.sum, 0);
    return { lines, total };
  }, [type, area, win, panoramicPrice, extras, wardrobeExtra, dry, mold, polyana, bathrooms, isRepair]);

  const estimateText = useMemo(() => {
    const rows = calc.lines.map((l) => `• ${l.label} — ${fmt(l.sum)}`).join('\n');
    return `Расчёт стоимости уборки «Империя Блеска»\n\n${rows}\n\nИТОГО: ${fmt(calc.total)}\n\nЦену фиксируем до начала работ. Оплата после приёмки по чек-листу.`;
  }, [calc]);

  const copyEstimate = async () => {
    try {
      await navigator.clipboard.writeText(estimateText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const reset = () => {
    setArea(50);
    switchType('general');
    setWin({ panoramic: 0, standard: 0, mini: 0, balconyDoor: 0 });
    setExtras({});
    setWardrobeExtra(0);
    setDry({});
    setMold(false);
    setPolyana(false);
    setBathrooms(0);
  };

  return (
    <>
      <Helmet>
        <title>Калькулятор для менеджеров — Империя Блеска</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-[#F7FAF9] text-[#0D4D49]">
        <header className="bg-[#003F3B] text-white">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Calculator className="w-6 h-6 text-[#41BFAE]" />
            <div>
              <h1 className="font-heading font-bold text-lg leading-tight">
                Калькулятор просчёта — для менеджеров
              </h1>
              <p className="text-xs text-white/60">
                Внутренняя страница, в поиске не отображается. Прайс от 12.06.2026.
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 grid lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* ЛЕВАЯ КОЛОНКА — ПАРАМЕТРЫ */}
          <div className="space-y-5">
            {/* Тип уборки + площадь */}
            <Section title="Уборка">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {(Object.keys(cleaningLabels) as CleaningType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchType(t)}
                    className={`py-2.5 px-2 rounded-xl border text-sm font-medium transition-all ${
                      type === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-[#DDEBE8] hover:border-primary/40'
                    }`}
                  >
                    {cleaningLabels[t]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium shrink-0">Площадь, м²</label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={area || ''}
                  onChange={(e) => setArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                  className="w-28 h-10"
                />
                <span className="text-sm text-muted-foreground">
                  Ставка: <b className="text-primary">{rateFor(type, area)} ₽/м²</b>
                </span>
              </div>
              {area > 100 && (
                <div className="mt-3 flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Объект больше 100 м² / корпоративный (офис, клиника, ресторан): предложи выезд
                    для точного расчёта или передай руководителю продаж — «свяжется в течение часа».
                  </span>
                </div>
              )}
            </Section>

            {/* Окна */}
            <Section title={`Окна ${isRepair ? '(тариф «после ремонта»)' : '(генеральная/влажная)'}`}>
              <div className="space-y-3">
                {(Object.keys(windowPrices) as (keyof typeof windowPrices)[]).map((k) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{windowPrices[k].label}</p>
                      <p className="text-xs text-muted-foreground">
                        {k === 'panoramic' ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Input
                              type="number"
                              value={panoramicPrice}
                              onChange={(e) => setPanoramicPrice(Math.max(0, Number(e.target.value) || 0))}
                              className="w-20 h-6 text-xs px-1.5 inline-block"
                            />
                            ₽/створка · {windowPrices[k].note}
                          </span>
                        ) : (
                          <>
                            {fmt(isRepair ? windowPrices[k].repair : windowPrices[k].usual)}
                            {('note' in windowPrices[k] && windowPrices[k].note) ? ` · ${windowPrices[k].note}` : ''}
                          </>
                        )}
                      </p>
                    </div>
                    <Counter value={win[k]} onChange={(v) => setWin({ ...win, [k]: v })} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Глухие окна с лестницей — цену увеличиваем; если их много — уменьшаем.
              </p>
            </Section>

            {/* Допуслуги */}
            <Section title="Дополнительные услуги">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {extraServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{fmt(s.price)} / {s.unit}</p>
                    </div>
                    <Counter
                      value={extras[s.id] || 0}
                      onChange={(v) => setExtras({ ...extras, [s.id]: v })}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[#DDEBE8] flex flex-wrap items-center gap-2">
                <span className="text-sm">Шкафы/комоды по квартире внутри:</span>
                {([0, 2000, 2500] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setWardrobeExtra(v)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      wardrobeExtra === v
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-[#DDEBE8]'
                    }`}
                  >
                    {v === 0 ? 'Нет' : `+${fmt(v)}`}
                  </button>
                ))}
              </div>
            </Section>

            {/* Химчистка */}
            <Section title="Химчистка мебели (цены «от»)">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {dryCleaning.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{s.label}</p>
                      <p className="text-xs text-muted-foreground">от {fmt(s.price)}</p>
                    </div>
                    <Counter value={dry[s.id] || 0} onChange={(v) => setDry({ ...dry, [s.id]: v })} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Особые случаи */}
            <Section title="Особые случаи">
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mold}
                    onChange={(e) => setMold(e.target.checked)}
                    className="mt-1 accent-[#00796F] w-4 h-4"
                  />
                  <span className="text-sm">
                    <b>Плесень (+1 500 ₽)</b> — запроси фото и согласуй с руководством. Скрипт:
                    «Сделаем всё, чтобы отмыть плесень. В 90% случаев получается, но иногда
                    застарелые пятна въедаются и не уходят».
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={polyana}
                    onChange={(e) => setPolyana(e.target.checked)}
                    className="mt-1 accent-[#00796F] w-4 h-4"
                  />
                  <span className="text-sm"><b>Выезд на Красную Поляну</b> (+2 000 ₽)</span>
                </label>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    <b>Отдельный санузел/ванная</b> без уборки квартиры — 6 000 ₽/шт
                  </span>
                  <Counter value={bathrooms} onChange={setBathrooms} />
                </div>
              </div>
            </Section>

            {/* Памятка */}
            <Section title="Памятка по возражениям">
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>
                  <b className="text-[#0D4D49]">«У меня нет ковров, снизьте цену»</b> — «Это наш
                  стандарт уборки, заложено в стоимость».
                </li>
                <li>
                  <b className="text-[#0D4D49]">«Дорого»</b> — опыт, оборудование, профессионально
                  обученный персонал. «Вам точно у нас понравится».
                </li>
                <li>
                  <b className="text-[#0D4D49]">Заявка на постоянную уборку</b> — передать
                  руководителю продаж.
                </li>
              </ul>
            </Section>
          </div>

          {/* ПРАВАЯ КОЛОНКА — СМЕТА */}
          <div className="lg:sticky lg:top-6 rounded-2xl bg-white border border-[#DDEBE8] p-5 shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)]">
            <h2 className="font-heading font-bold mb-3">Смета</h2>
            {calc.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Заполни параметры слева.</p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                {calc.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{l.label}</span>
                    <span className="font-medium whitespace-nowrap">{fmt(l.sum)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-[#DDEBE8] mt-4 pt-4 flex items-baseline justify-between">
              <span className="font-heading font-bold text-lg">Итого</span>
              <span className="font-heading font-bold text-3xl text-primary">{fmt(calc.total)}</span>
            </div>
            <div className="mt-4 grid gap-2">
              <Button onClick={copyEstimate} className="w-full rounded-xl hero-gradient text-white" disabled={calc.lines.length === 0}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Скопировано!' : 'Скопировать смету для клиента'}
              </Button>
              <Button variant="outline" onClick={reset} className="w-full rounded-xl border-[#DDEBE8]">
                Сбросить
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
              Минимальный заказ — 6 000 ₽ (учитывается автоматически). Химчистка и окна
              считаются поверх минималки.
            </p>
          </div>
        </main>
      </div>
    </>
  );
};

export default InternalCalc;
