import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Copy, Check, AlertTriangle, Calculator, Send, TrendingUp, Settings2, Settings, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/* ====================== AMO CRM ====================== */

const AMO_FORM = {
  url: 'https://forms.amocrm.ru/queue/add',
  id: '1721178',
  hash: 'c3be832a2e589205570c43f4bcb9abe1',
  nameField: 'fields[name_1]',
  phoneField: 'fields[1159022_1][1392964]',
  leadNameField: 'fields[name_2]',
  priceField: 'fields[price_2]',
  noteField: 'fields[note_2]',
};

async function sendToAmo(payload: {
  contactName: string;
  phone: string;
  leadName: string;
  price: number;
  note: string;
}) {
  const fd = new FormData();
  fd.append('form_id', AMO_FORM.id);
  fd.append('hash', AMO_FORM.hash);
  fd.append(
    'user_origin',
    JSON.stringify({
      datetime: new Date().toString(),
      timezone: 'Europe/Moscow',
      referer: '/calc',
    })
  );
  fd.append(AMO_FORM.nameField, payload.contactName);
  fd.append(AMO_FORM.phoneField, payload.phone);
  fd.append(AMO_FORM.leadNameField, payload.leadName);
  fd.append(AMO_FORM.priceField, String(payload.price));
  fd.append(AMO_FORM.noteField, payload.note);

  await fetch(AMO_FORM.url, { method: 'POST', mode: 'no-cors', body: fd });
}

/* ====================== ПРАЙС ====================== */

type CleaningType = 'wet' | 'general' | 'repair' | 'all_inclusive';

/* ====================== ОБЩИЕ ЦЕНЫ (PRICING) ====================== */
// Дефолтные цены калькулятора. Хранятся в Supabase в таблице
// pricing_config (id='default'), синхронизированы между всеми менеджерами.
// Если Supabase недоступен — калькулятор работает на этих дефолтах.
export const PRICING_DEFAULTS = {
  minOrder: 6000,
  rates: {
    wet:     [ {upTo:60,price:160},{upTo:70,price:150},{upTo:80,price:140},{upTo:90,price:130},{upTo:99,price:120},{upTo:null as number|null,price:110} ],
    general: [ {upTo:60,price:280},{upTo:80,price:270},{upTo:99,price:260},{upTo:null as number|null,price:250} ],
    repair:  [ {upTo:99,price:300},{upTo:null as number|null,price:280} ],
    allInclusive: 450,
  },
  windows: {
    panoramic:   { usual:1200, repair:2000 },
    standard:    { usual:500,  repair:750  },
    mini:        { usual:400,  repair:500  },
    balconyDoor: { usual:1200, repair:1500 },
  },
  extras: {
    fridge:900, fridge2:1800, oven:900, microwave:500, hood:700, kitchen_cabinet:250,
    curtains_wash:1500, curtains_iron:1000, ironing:800, linen:500,
    chandelier:500, chandelier_big:1500, ac:500, seams:3000,
  } as Record<string, number>,
  dry: {
    sofa2:3500, sofa3:5000, sofa_corner:7500, sofa_slide:800, pillow:400, mattress:2800,
    armchair:1200, chair:450, headboard:1200, pouf:550, bench:1200, carseat:1500, stroller:2500,
  } as Record<string, number>,
  wardrobe: [2000, 2500] as number[],
  special: { bathroom:6000, mold:1500, polyana:2000 },
};

export type PricingConfig = typeof PRICING_DEFAULTS;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Глубокое слияние data из Supabase поверх дефолтов (на случай новых полей).
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

const mergePricing = (saved: unknown): PricingConfig =>
  mergePricingValue(PRICING_DEFAULTS, saved) as PricingConfig;

const rateForPricing = (pricing: PricingConfig, type: CleaningType, area: number): number => {
  if (type === 'all_inclusive') return pricing.rates.allInclusive;
  const brackets = pricing.rates[type as 'wet' | 'general' | 'repair'];
  for (const b of brackets) {
    if (b.upTo == null || area <= b.upTo) return b.price;
  }
  return brackets[brackets.length - 1].price;
};

const rateBracketLabel = (upTo: number | null, idx: number, arr: { upTo: number | null }[]): string => {
  if (upTo == null) {
    const prev = idx > 0 ? arr[idx - 1].upTo : null;
    return prev != null ? `свыше ${prev} м²` : 'все площади';
  }
  return `до ${upTo} м²`;
};



/* ====================== МАРЖИНАЛЬНОСТЬ ====================== */
// Дефолты — из фин.модели (ОПУ за год). Все значения можно править
// в калькуляторе (шестерёнка в блоке «Экономика сделки»), они
// сохраняются локально в браузере менеджера.
//
// Клинеры — фикс за человека: норматив м²/клинер по типу уборки, допуск +3 м².
// workCosts — % от цены ПО ПРАЙСУ: зависят от объёма работ, скидка их НЕ уменьшает.
// dryCosts — % от суммы химчистки по прайсу (бригадир делает её сам).
// revenueCosts — % от ВАЛА (фактической цены со скидкой):
//   бригадир 7%, менеджер, реклама, налоги.
// Фикс бригадира 60 000 ₽/мес — в постоянке, в сделку не входит.
const ECON_DEFAULTS = {
  cleanerNorms: [
    { id: 'wet', label: 'Влажная', area: 100, pay: 2500 },
    { id: 'general', label: 'Генеральная', area: 30, pay: 3000 },
    { id: 'repair', label: 'После ремонта', area: 25, pay: 3500 },
    { id: 'all_inclusive', label: 'Всё включено', area: 25, pay: 3500 },
  ],
  cleanerTolerance: 3, // допустимый перебор м² на клинера
  workCosts: [
    { id: 'materials', label: 'Расходные материалы', pct: 3.5 },
    { id: 'transport', label: 'Транспорт', pct: 2.7 },
    { id: 'amort', label: 'Амортизация оборудования', pct: 1 },
  ],
  dryCosts: [
    { id: 'brigadierDry', label: 'Бригадир с химчистки', pct: 50 },
  ],
  revenueCosts: [
    { id: 'brigadier', label: 'Бригадир (от вала)', pct: 7 },
    { id: 'manager', label: 'Менеджер (от вала)', pct: 7 },
    { id: 'ads', label: 'Реклама / привлечение', pct: 7.7 },
    { id: 'tax', label: 'Налоги', pct: 1 },
  ],
  greenAt: 30, // маржа ≥ — зелёная зона
  yellowAt: 20, // маржа ≥ — жёлтая зона, ниже — красная
};

const ECON_LS_KEY = 'calc_econ_constants_v1';

const econDefaultValues = (): Record<string, number> => {
  const base: Record<string, number> = {
    greenAt: ECON_DEFAULTS.greenAt,
    yellowAt: ECON_DEFAULTS.yellowAt,
  };
  [...ECON_DEFAULTS.workCosts, ...ECON_DEFAULTS.dryCosts, ...ECON_DEFAULTS.revenueCosts].forEach((c) => {
    base[c.id] = c.pct;
  });
  ECON_DEFAULTS.cleanerNorms.forEach((n) => {
    base['norm_' + n.id] = n.area;
    base['pay_' + n.id] = n.pay;
  });
  return base;
};

const cleaningOrder: CleaningType[] = ['wet', 'general', 'repair', 'all_inclusive'];

const cleaningLabels: Record<CleaningType, string> = {
  wet: 'Влажная',
  general: 'Генеральная',
  repair: 'После ремонта',
  all_inclusive: 'Всё включено',
};

// Тип-обёртка вынесена в rateForPricing(pricing, ...) выше.
// Внутри компонента ниже создаём `const rateFor = (t,a) => rateForPricing(pricing,t,a)`.

// Окна: [обычная уборка, после ремонта]
const windowPrices = {
  panoramic: { label: 'Панорамная створка (в пол)', usual: 1200, repair: 2000, note: 'обычно 900–1200 / 1500–2000 ₽, правь цену под объект' },
  standard: { label: 'Стандартная створка', usual: 500, repair: 750 },
  mini: { label: 'Мини-окно', usual: 400, repair: 500 },
  balconyDoor: { label: 'Балконная дверь', usual: 1200, repair: 1500 },
};

// Порядок: техника внутри → шкафы → шторы/бельё → люстры → кондиционер → швы
const extraServices = [
  { id: 'fridge', label: 'Холодильник внутри', price: 900, unit: 'шт' },
  { id: 'fridge2', label: 'Двухкамерный холодильник', price: 1800, unit: 'шт' },
  { id: 'oven', label: 'Духовой шкаф внутри', price: 900, unit: 'шт' },
  { id: 'microwave', label: 'Микроволновка', price: 500, unit: 'шт' },
  { id: 'hood', label: 'Вытяжка', price: 700, unit: 'шт' },
  { id: 'kitchen_cabinet', label: 'Кухонный шкаф внутри', price: 250, unit: 'шт' },
  { id: 'curtains_wash', label: 'Шторы: постирать и повесить', price: 1500, unit: 'окно' },
  { id: 'curtains_iron', label: 'Шторы: погладить', price: 1000, unit: 'окно' },
  { id: 'ironing', label: 'Глажка белья (есть ли утюг у клиента?)', price: 800, unit: 'час' },
  { id: 'linen', label: 'Смена белья (за всё)', price: 500, unit: 'раз' },
  { id: 'chandelier', label: 'Люстра обычная', price: 500, unit: 'шт' },
  { id: 'chandelier_big', label: 'Люстра большая', price: 1500, unit: 'шт' },
  { id: 'ac', label: 'Кондиционер (сетка)', price: 500, unit: 'шт' },
  { id: 'seams', label: 'Швы отпаривателем', price: 3000, unit: 'комната' },
] as const;

// Порядок: диваны + к ним выдвижное и подушки → матрасы → кресла → стулья → остальное
const dryCleaning = [
  { id: 'sofa2', label: 'Диван двухместный', price: 3500 },
  { id: 'sofa3', label: 'Диван трёхместный', price: 5000 },
  { id: 'sofa_corner', label: 'Диван угловой', price: 7500 },
  { id: 'sofa_slide', label: 'Выдвижное место дивана', price: 800 },
  { id: 'pillow', label: 'Подушка', price: 400 },
  { id: 'mattress', label: 'Матрас (одна сторона)', price: 2800 },
  { id: 'armchair', label: 'Кресло', price: 1200 },
  { id: 'chair', label: 'Стул', price: 450 },
  { id: 'headboard', label: 'Изголовье кровати', price: 1200 },
  { id: 'pouf', label: 'Пуф', price: 550 },
  { id: 'bench', label: 'Банкетка', price: 1200 },
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

const clampDirt = (v: number) => Math.min(3, Math.max(1, v));

/* ====================== СТРАНИЦА ====================== */

const InternalCalcContent = () => {
  // ===== ОБЩИЕ ЦЕНЫ (Supabase) =====
  const [pricing, setPricing] = useState<PricingConfig>(PRICING_DEFAULTS);
  const [showPricingPanel, setShowPricingPanel] = useState(false);
  const [pricingSaveStatus, setPricingSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('pricing_config')
          .select('data')
          .eq('id', 'default')
          .maybeSingle();
        if (cancelled) return;
        if (!error && data?.data) {
          setPricing(mergePricing(data.data));
        }
      } catch {
        // молча игнорируем — работаем на дефолтах
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const savePricing = async () => {
    setPricingSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('pricing_config')
        .upsert({ id: 'default', data: pricing as unknown as Json, updated_at: new Date().toISOString() });
      if (error) throw error;
      setPricingSaveStatus('ok');
      setTimeout(() => setPricingSaveStatus('idle'), 2500);
    } catch (e) {
      console.error(e);
      setPricingSaveStatus('err');
      setTimeout(() => setPricingSaveStatus('idle'), 3500);
    }
  };

  const resetPricing = () => setPricing(PRICING_DEFAULTS);

  const rateFor = (t: CleaningType, a: number) => rateForPricing(pricing, t, a);

  const [type, setType] = useState<CleaningType>('wet');
  const [area, setArea] = useState<number>(0);
  const [dirt, setDirt] = useState<number>(1.0);

  const [win, setWin] = useState({ panoramic: 0, standard: 0, mini: 0, balconyDoor: 0 });
  const [panoramicPrice, setPanoramicPrice] = useState<number>(PRICING_DEFAULTS.windows.panoramic.usual);
  const [windowFilm, setWindowFilm] = useState(false);

  const [extras, setExtras] = useState<Record<string, number>>({});
  const [wardrobeExtra, setWardrobeExtra] = useState<number>(0);
  const [dry, setDry] = useState<Record<string, number>>({});

  const [mold, setMold] = useState(false);
  const [polyana, setPolyana] = useState(false);
  const [privateHouse, setPrivateHouse] = useState(false);
  const [bathrooms, setBathrooms] = useState(0);

  // Данные клиента
  const [client, setClient] = useState({
    date: '',
    time: '',
    name: '',
    phone: '',
    address: '',
    floor: '',
    apartment: '',
    intercom: '',
    note: '',
  });
  const setC = (k: keyof typeof client, v: string) => setClient({ ...client, [k]: v });

  const [copied, setCopied] = useState(false);
  const [amoStatus, setAmoStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [manualPrice, setManualPrice] = useState<number | null>(null);
  // Ручная корректировка числа клинеров (null — авто по нормативу)
  const [cleanersOverride, setCleanersOverride] = useState<number | null>(null);

  // Константы экономики (редактируемые, живут в localStorage браузера)
  const [econConf, setEconConf] = useState<Record<string, number>>(() => {
    const base = econDefaultValues();
    try {
      const saved = JSON.parse(localStorage.getItem(ECON_LS_KEY) || '{}');
      return { ...base, ...saved };
    } catch {
      return base;
    }
  });
  const [showEconSettings, setShowEconSettings] = useState(false);

  const setEconVal = (k: string, v: number) => {
    const next = { ...econConf, [k]: Math.max(0, v) };
    setEconConf(next);
    try {
      localStorage.setItem(ECON_LS_KEY, JSON.stringify(next));
    } catch {
      // localStorage может быть запрещён настройками браузера.
    }
  };

  const resetEconConf = () => {
    const base = econDefaultValues();
    setEconConf(base);
    try {
      localStorage.removeItem(ECON_LS_KEY);
    } catch {
      // localStorage может быть запрещён настройками браузера.
    }
  };

  const isRepair = type === 'repair';
  const filmActive = isRepair && windowFilm;

  const switchType = (t: CleaningType) => {
    setType(t);
    setCleanersOverride(null);
    setPanoramicPrice(t === 'repair' ? pricing.windows.panoramic.repair : pricing.windows.panoramic.usual);
    if (t !== 'repair') setWindowFilm(false);
  };

  const calc = useMemo(() => {
    const lines: { label: string; sum: number }[] = [];

    // Основная уборка (коэффициент загрязнённости — только сюда)
    const rate = rateForPricing(pricing, type, area);
    const k = clampDirt(dirt);
    const baseRaw = area > 0 ? Math.round(area * rate * k) : 0;
    const base = area > 0 ? Math.max(baseRaw, pricing.minOrder) : 0;
    if (area > 0) {
      const kTxt = k !== 1 ? ` × ${k.toFixed(1)} (загрязнённости)` : '';
      lines.push({
        label: `${cleaningLabels[type]} уборка, ${area} м² × ${rate} ₽${kTxt}` + (base > baseRaw ? ' (минималка)' : ''),
        sum: base,
      });
    }

    // Окна (плёнка ×2 — только после ремонта)
    const filmK = filmActive ? 2 : 1;
    const wp = (key: keyof typeof windowPrices) =>
      (key === 'panoramic' ? panoramicPrice : isRepair ? pricing.windows[key].repair : pricing.windows[key].usual) * filmK;
    (Object.keys(windowPrices) as (keyof typeof windowPrices)[]).forEach((key) => {
      const count = win[key];
      if (count > 0)
        lines.push({
          label: `${windowPrices[key].label} × ${count}${filmActive ? ' (плёнка ×2)' : ''}`,
          sum: count * wp(key),
        });
    });

    // Допуслуги
    extraServices.forEach((s) => {
      const count = extras[s.id] || 0;
      const price = pricing.extras[s.id] ?? s.price;
      if (count > 0) lines.push({ label: `${s.label} × ${count} ${s.unit}`, sum: count * price });
    });
    if (wardrobeExtra > 0) lines.push({ label: 'Шкафы/комоды внутри (фикс)', sum: wardrobeExtra });

    // Химчистка
    let dryTotal = 0;
    dryCleaning.forEach((s) => {
      const count = dry[s.id] || 0;
      const price = pricing.dry[s.id] ?? s.price;
      if (count > 0) {
        const sum = count * price;
        dryTotal += sum;
        lines.push({ label: `Химчистка: ${s.label} × ${count}`, sum });
      }
    });

    if (bathrooms > 0) lines.push({ label: `Отдельный санузел/ванная × ${bathrooms}`, sum: bathrooms * pricing.special.bathroom });
    if (mold) lines.push({ label: 'Обработка плесени', sum: pricing.special.mold });
    if (polyana) lines.push({ label: 'Выезд на Красную Поляну', sum: pricing.special.polyana });

    const total = lines.reduce((a, l) => a + l.sum, 0);
    return { lines, total, dryTotal };
  }, [pricing, type, area, dirt, win, panoramicPrice, filmActive, isRepair, extras, wardrobeExtra, dry, mold, polyana, bathrooms]);

  const finalTotal = manualPrice ?? calc.total;
  const hasDiscount = manualPrice !== null && manualPrice !== calc.total;
  const discountPct =
    hasDiscount && calc.total > 0 && manualPrice! < calc.total
      ? Math.round((1 - manualPrice! / calc.total) * 100)
      : 0;

  // ===== Экономика сделки =====
  const econ = useMemo(() => {
    const otherWorkPct = ECON_DEFAULTS.workCosts.reduce((a, c) => a + (econConf[c.id] || 0), 0);
    const dryPct = ECON_DEFAULTS.dryCosts.reduce((a, c) => a + (econConf[c.id] || 0), 0);
    const revPct = ECON_DEFAULTS.revenueCosts.reduce((a, c) => a + (econConf[c.id] || 0), 0);

    // Клинеры — фикс за человека: норматив м²/клинер по типу уборки (+3 м² ок)
    const norm = econConf['norm_' + type] || 100;
    const pay = econConf['pay_' + type] || 0;
    const autoCleaners =
      area > 0 ? Math.max(1, Math.ceil((area - ECON_DEFAULTS.cleanerTolerance) / Math.max(1, norm))) : 0;
    const cleanersCount = cleanersOverride ?? autoCleaners;
    const cleanersCost = cleanersCount * pay;
    const otherWorkCost = (calc.total * otherWorkPct) / 100;
    // Бригадиру — % от химчистки по прайсу
    const dryCost = (calc.dryTotal * dryPct) / 100;
    const workCost = cleanersCost + otherWorkCost + dryCost;
    // Затраты от вала — от фактической цены
    const revCost = (finalTotal * revPct) / 100;

    const margin = finalTotal - workCost - revCost;
    const marginPctVal = finalTotal > 0 ? (margin / finalTotal) * 100 : 0;

    // Минимальная цена, при которой маржа не падает ниже m %
    const minPriceFor = (m: number) => {
      const d = 1 - revPct / 100 - m / 100;
      return d > 0 ? workCost / d : Infinity;
    };

    const greenAt = econConf.greenAt ?? ECON_DEFAULTS.greenAt;
    const yellowAt = econConf.yellowAt ?? ECON_DEFAULTS.yellowAt;

    const status: 'green' | 'yellow' | 'red' =
      marginPctVal >= greenAt ? 'green' : marginPctVal >= yellowAt ? 'yellow' : 'red';

    return {
      workPct: calc.total > 0 ? (otherWorkCost / calc.total) * 100 : 0,
      cleanersCount,
      autoCleaners,
      cleanersPay: pay,
      cleanersCost,
      dryPct,
      revPct,
      workCost,
      cleanWorkCost: cleanersCost + otherWorkCost,
      dryCost,
      revCost,
      margin,
      marginPctVal,
      greenAt,
      yellowAt,
      status,
      minGreen: minPriceFor(greenAt),
      minYellow: minPriceFor(yellowAt),
    };
  }, [calc.total, calc.dryTotal, finalTotal, econConf, type, area, cleanersOverride]);

  const discountTo = (minPrice: number) => {
    const d = Math.max(0, calc.total - Math.ceil(minPrice));
    const pct = calc.total > 0 ? Math.floor((d / calc.total) * 100) : 0;
    return { d, pct };
  };
  const toGreen = discountTo(econ.minGreen);
  const toYellow = discountTo(econ.minYellow);

  const estimateText = useMemo(() => {
    const rows = calc.lines.map((l) => `• ${l.label} — ${fmt(l.sum)}`).join('\n');

    const info: string[] = [];
    if (client.name) info.push(`Имя: ${client.name}`);
    if (client.phone) info.push(`Телефон: ${client.phone}`);
    if (client.date || client.time) info.push(`Дата и время: ${[client.date, client.time].filter(Boolean).join(' ')}`);
    if (client.address) info.push(`Адрес: ${client.address}`);
    const flat = [
      client.floor && `этаж ${client.floor}`,
      client.apartment && `кв. ${client.apartment}`,
      client.intercom && `домофон ${client.intercom}`,
    ].filter(Boolean).join(', ');
    if (flat) info.push(flat[0].toUpperCase() + flat.slice(1));
    if (client.note) info.push(`Дополнительно: ${client.note}`);
    const infoBlock = info.length ? `\n\nДанные клиента:\n${info.join('\n')}` : '';

    const totalBlock = hasDiscount
      ? `ИТОГО по прайсу: ${fmt(calc.total)}\nЦЕНА ДЛЯ ВАС: ${fmt(finalTotal)}${discountPct > 0 ? ` (скидка ${discountPct}%)` : ''}`
      : `ИТОГО: ${fmt(calc.total)}`;

    return `Расчёт стоимости уборки «Империя Блеска»\n\n${rows}\n\n${totalBlock}${infoBlock}\n\nЦену фиксируем до начала работ. Оплата после приёмки по чек-листу.`;
  }, [calc, client, hasDiscount, finalTotal, discountPct]);

  const copyEstimate = async () => {
    try {
      await navigator.clipboard.writeText(estimateText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // В старых браузерах менеджер сможет выделить и скопировать текст вручную.
    }
  };

  const amoReady = client.phone.replace(/\D/g, '').length >= 10 && calc.lines.length > 0;

  const submitToAmo = async () => {
    if (!amoReady || amoStatus === 'sending') return;
    try {
      setAmoStatus('sending');
      const dt = [client.date, client.time].filter(Boolean).join(' ');
      await sendToAmo({
        contactName: client.name || 'Без имени',
        phone: client.phone,
        leadName: `Калькулятор: ${cleaningLabels[type]}, ${area} м²${dt ? ` на ${dt}` : ''}`,
        price: finalTotal,
        note: `${estimateText}\n\n— — —\nВнутреннее (клиенту не отправлять):\nМаржа сделки: ${fmt(Math.round(econ.margin))} (${econ.marginPctVal.toFixed(0)}%)\nМаржа без клинеров: ${fmt(Math.round(econ.margin + econ.cleanersCost))}`,
      });
      setAmoStatus('ok');
      setTimeout(() => setAmoStatus('idle'), 4000);
    } catch (e) {
      console.error(e);
      setAmoStatus('err');
      setTimeout(() => setAmoStatus('idle'), 4000);
    }
  };

  const reset = () => {
    switchType('wet');
    setArea(0);
    setDirt(1.0);
    setWin({ panoramic: 0, standard: 0, mini: 0, balconyDoor: 0 });
    setWindowFilm(false);
    setExtras({});
    setWardrobeExtra(0);
    setDry({});
    setMold(false);
    setPolyana(false);
    setPrivateHouse(false);
    setBathrooms(0);
    setManualPrice(null);
    setCleanersOverride(null);
    setClient({ date: '', time: '', name: '', phone: '', address: '', floor: '', apartment: '', intercom: '', note: '' });
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
            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-lg leading-tight">
                Калькулятор просчёта — для менеджеров
              </h1>
              <p className="text-xs text-white/60">
                Внутренняя страница, в поиске не отображается. Прайс от 12.06.2026.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPricingPanel(true)}
              title="Настройки цен"
              aria-label="Настройки цен"
              className="shrink-0 w-10 h-10 rounded-lg border border-white/10 hover:bg-white/10 flex items-center justify-center text-[#41BFAE] transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 grid lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* ЛЕВАЯ КОЛОНКА — ПАРАМЕТРЫ */}
          <div className="space-y-5">
            {/* Тип уборки + площадь + загрязнённость */}
            <Section title="Уборка">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {cleaningOrder.map((t) => (
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

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium shrink-0">Площадь, м²</label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={area || ''}
                    onChange={(e) => {
                      setArea(Math.max(0, Math.min(1000, Number(e.target.value) || 0)));
                      setCleanersOverride(null);
                    }}
                    className="w-24 h-10"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  Ставка: <b className="text-primary">{rateFor(type, area)} ₽/м²</b>
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-[#DDEBE8]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    Коэффициент загрязнённости
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      только на уборку по м², от 1.0 до 3.0
                    </span>
                  </label>
                  <span className={`font-heading font-bold ${dirt > 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    ×{clampDirt(dirt).toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={clampDirt(dirt)}
                  onChange={(e) => setDirt(clampDirt(Number(e.target.value)))}
                  className="w-full accent-primary"
                  aria-label="Коэффициент загрязнённости"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1.0 — обычное состояние</span>
                  <span>3.0 — экстремальное</span>
                </div>
              </div>

              {area > 100 && (
                <div className="mt-4 flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
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
              {isRepair && (
                <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 rounded-xl bg-[#F7FAF9] border border-[#DDEBE8]">
                  <input
                    type="checkbox"
                    checked={windowFilm}
                    onChange={(e) => setWindowFilm(e.target.checked)}
                    className="accent-[#00796F] w-4 h-4"
                  />
                  <span className="text-sm">
                    <b>Плёнка на окнах</b> — все окна <b className="text-primary">×2</b>
                  </span>
                </label>
              )}
              <div className="space-y-3">
                {(Object.keys(windowPrices) as (keyof typeof windowPrices)[]).map((k) => {
                  const baseP = k === 'panoramic' ? panoramicPrice : isRepair ? pricing.windows[k].repair : pricing.windows[k].usual;
                  const effP = baseP * (filmActive ? 2 : 1);
                  return (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{windowPrices[k].label}</p>
                        <p className="text-xs text-muted-foreground">
                          {k === 'panoramic' ? (
                            <span className="inline-flex items-center gap-1.5 flex-wrap">
                              <Input
                                type="number"
                                value={panoramicPrice}
                                onChange={(e) => setPanoramicPrice(Math.max(0, Number(e.target.value) || 0))}
                                className="w-20 h-6 text-xs px-1.5 inline-block"
                              />
                              ₽{filmActive ? ` → ${fmt(effP)} с плёнкой` : '/створка'} · {windowPrices[k].note}
                            </span>
                          ) : (
                            <>
                              {fmt(baseP)}
                              {filmActive ? ` → ${fmt(effP)} с плёнкой` : ''}
                            </>
                          )}
                        </p>
                      </div>
                      <Counter value={win[k]} onChange={(v) => setWin({ ...win, [k]: v })} />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Глухие окна с лестницей — цену увеличиваем; если их много — уменьшаем.
              </p>
            </Section>

            {/* Допуслуги */}
            <Section title="Дополнительные услуги">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                {extraServices.map((s) => {
                  const price = pricing.extras[s.id] ?? s.price;
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{fmt(price)} / {s.unit}</p>
                      </div>
                      <Counter
                        value={extras[s.id] || 0}
                        onChange={(v) => setExtras({ ...extras, [s.id]: v })}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-[#DDEBE8] flex flex-wrap items-center gap-2">
                <span className="text-sm">Шкафы/комоды по квартире внутри:</span>
                {[0, ...pricing.wardrobe].map((v) => (
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
                {dryCleaning.map((s) => {
                  const price = pricing.dry[s.id] ?? s.price;
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{s.label}</p>
                        <p className="text-xs text-muted-foreground">от {fmt(price)}</p>
                      </div>
                      <Counter value={dry[s.id] || 0} onChange={(v) => setDry({ ...dry, [s.id]: v })} />
                    </div>
                  );
                })}
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
                    <b>Плесень (+{fmt(pricing.special.mold)})</b> — запроси фото и согласуй с руководством. Скрипт:
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
                  <span className="text-sm"><b>Выезд на Красную Поляну</b> (+{fmt(pricing.special.polyana)})</span>
                </label>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    <b>Отдельный санузел/ванная</b> без уборки квартиры — {fmt(pricing.special.bathroom)}/шт
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

          {/* ПРАВАЯ КОЛОНКА — СМЕТА + ЭКОНОМИКА + КЛИЕНТ */}
          <div className="lg:sticky lg:top-6 space-y-5">
            <div className="rounded-2xl bg-white border border-[#DDEBE8] p-5 shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)]">
              <h2 className="font-heading font-bold mb-3">Смета</h2>
              {calc.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Заполни параметры слева.</p>
              ) : (
                <div className="space-y-2 max-h-[35vh] overflow-auto pr-1">
                  {calc.lines.map((l, i) => (
                    <div key={i} className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{l.label}</span>
                      <span className="font-medium whitespace-nowrap">{fmt(l.sum)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-[#DDEBE8] mt-4 pt-4 flex items-baseline justify-between">
                <span className="font-heading font-bold text-lg">Итого по прайсу</span>
                <span className={`font-heading font-bold ${hasDiscount ? 'text-xl text-muted-foreground line-through' : 'text-3xl text-primary'}`}>
                  {fmt(calc.total)}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-[#DDEBE8]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Ручная корректировка / цена со скидкой</p>
                    {hasDiscount && discountPct > 0 && (
                      <p className="text-xs text-primary font-medium mt-0.5">
                        скидка {discountPct}% (−{fmt(calc.total - finalTotal)})
                      </p>
                    )}
                    {hasDiscount && manualPrice! > calc.total && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        наценка +{fmt(finalTotal - calc.total)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      value={finalTotal || ''}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setManualPrice(v === calc.total ? null : v);
                      }}
                      className="w-32 h-10 text-right font-heading font-bold text-primary"
                    />
                    <span className="text-sm font-medium">₽</span>
                  </div>
                </div>
                {hasDiscount && (
                  <button
                    type="button"
                    onClick={() => setManualPrice(null)}
                    className="text-xs text-muted-foreground underline mt-1.5 hover:text-primary"
                  >
                    Вернуть расчётную цену
                  </button>
                )}
              </div>
            </div>

            {/* ЭКОНОМИКА СДЕЛКИ */}
            <div className="rounded-2xl bg-white border border-[#DDEBE8] p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Экономика сделки
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  клиенту не показывать
                </span>
              </div>

              {calc.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Появится после расчёта.</p>
              ) : (
                <>
                  <div
                    className={`rounded-xl border p-3 ${
                      econ.status === 'green'
                        ? 'bg-emerald-50 border-emerald-200'
                        : econ.status === 'yellow'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">Маржа сделки</span>
                      <span
                        className={`font-heading font-bold text-xl whitespace-nowrap ${
                          econ.status === 'green'
                            ? 'text-emerald-700'
                            : econ.status === 'yellow'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {fmt(Math.round(econ.margin))} · {econ.marginPctVal.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {econ.status === 'green'
                        ? 'Отличная сделка — есть запас на скидку.'
                        : econ.status === 'yellow'
                        ? 'Приемлемо, но ниже целевой маржи. Больше не скидывай.'
                        : 'Маржа ниже минимума — скидку согласуй с руководителем!'}
                    </p>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 flex-wrap">
                        Клинеры × {fmt(econ.cleanersPay)}
                        <Counter
                          value={econ.cleanersCount}
                          onChange={(v) => setCleanersOverride(v === econ.autoCleaners ? null : v)}
                        />
                        {cleanersOverride !== null && cleanersOverride !== econ.autoCleaners && (
                          <button
                            type="button"
                            onClick={() => setCleanersOverride(null)}
                            className="text-[10px] underline text-muted-foreground hover:text-primary"
                          >
                            авто: {econ.autoCleaners}
                          </button>
                        )}
                      </span>
                      <span className="whitespace-nowrap">{fmt(Math.round(econ.cleanersCost))}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Материалы, транспорт, амортизация ({econ.workPct.toFixed(1)}% от прайса)</span>
                      <span className="whitespace-nowrap">{fmt(Math.round(econ.cleanWorkCost - econ.cleanersCost))}</span>
                    </div>
                    {econ.dryCost > 0 && (
                      <div className="flex justify-between gap-2">
                        <span>Бригадир с химчистки ({econ.dryPct.toFixed(0)}%)</span>
                        <span className="whitespace-nowrap">{fmt(Math.round(econ.dryCost))}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span>Затраты от вала ({econ.revPct.toFixed(1)}%)</span>
                      <span className="whitespace-nowrap">{fmt(Math.round(econ.revCost))}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-dashed border-[#DDEBE8] text-xs space-y-1.5">
                    <p>
                      🟢 Скидка до <b>{fmt(toGreen.d)}</b> ({toGreen.pct}%) — маржа останется ≥ {econ.greenAt}%
                    </p>
                    <p>
                      🟡 Максимум <b>{fmt(toYellow.d)}</b> ({toYellow.pct}%) — маржа ≥ {econ.yellowAt}%.
                      Ниже — только через руководителя.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEconSettings(!showEconSettings)}
                    className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    {showEconSettings ? 'Скрыть константы' : 'Константы (настроить %)'}
                  </button>

                  {showEconSettings && (
                    <div className="mt-3 pt-3 border-t border-[#DDEBE8] space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Клинеры: м² на человека / оплата (+3 м² допуск)
                        </p>
                        <div className="space-y-1.5">
                          {ECON_DEFAULTS.cleanerNorms.map((n) => (
                            <div key={n.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs">{n.label}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Input
                                  type="number"
                                  min={1}
                                  value={econConf['norm_' + n.id] ?? n.area}
                                  onChange={(e) => setEconVal('norm_' + n.id, Number(e.target.value) || 0)}
                                  className="w-14 h-7 text-xs text-right px-1.5"
                                />
                                <span className="text-[10px] text-muted-foreground">м²</span>
                                <Input
                                  type="number"
                                  min={0}
                                  step={100}
                                  value={econConf['pay_' + n.id] ?? n.pay}
                                  onChange={(e) => setEconVal('pay_' + n.id, Number(e.target.value) || 0)}
                                  className="w-16 h-7 text-xs text-right px-1.5"
                                />
                                <span className="text-[10px] text-muted-foreground">₽</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          % от прайса (объём работ, скидка не уменьшает)
                        </p>
                        <div className="space-y-1.5">
                          {ECON_DEFAULTS.workCosts.map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs">{c.label}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={econConf[c.id] ?? 0}
                                  onChange={(e) => setEconVal(c.id, Number(e.target.value) || 0)}
                                  className="w-16 h-7 text-xs text-right px-1.5"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          % с химчистки (по прайсу)
                        </p>
                        <div className="space-y-1.5">
                          {ECON_DEFAULTS.dryCosts.map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs">{c.label}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={econConf[c.id] ?? 0}
                                  onChange={(e) => setEconVal(c.id, Number(e.target.value) || 0)}
                                  className="w-16 h-7 text-xs text-right px-1.5"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          % от вала (фактической цены)
                        </p>
                        <div className="space-y-1.5">
                          {ECON_DEFAULTS.revenueCosts.map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-2">
                              <span className="text-xs">{c.label}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={econConf[c.id] ?? 0}
                                  onChange={(e) => setEconVal(c.id, Number(e.target.value) || 0)}
                                  className="w-16 h-7 text-xs text-right px-1.5"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Пороги светофора (маржа, %)
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs">🟢 Зелёная зона от</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                type="number"
                                min={0}
                                value={econConf.greenAt ?? ECON_DEFAULTS.greenAt}
                                onChange={(e) => setEconVal('greenAt', Number(e.target.value) || 0)}
                                className="w-16 h-7 text-xs text-right px-1.5"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs">🟡 Жёлтая зона от</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                type="number"
                                min={0}
                                value={econConf.yellowAt ?? ECON_DEFAULTS.yellowAt}
                                onChange={(e) => setEconVal('yellowAt', Number(e.target.value) || 0)}
                                className="w-16 h-7 text-xs text-right px-1.5"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={resetEconConf}
                        className="text-xs text-muted-foreground underline hover:text-primary"
                      >
                        Сбросить к дефолтам из фин.модели
                      </button>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Константы сохраняются в этом браузере. Постоянка (офис, склад, управляющий,
                        фикс бригадира 60 000 ₽ и т.д.) ≈ 185 000 ₽/мес — в маржу сделки не входит.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-[#DDEBE8] p-5">
              <h2 className="font-heading font-bold mb-3">Данные клиента</h2>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs text-muted-foreground">День уборки</label>
                  <Input type="date" value={client.date} onChange={(e) => setC('date', e.target.value)} className="h-10 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Время</label>
                  <Input type="time" value={client.time} onChange={(e) => setC('time', e.target.value)} className="h-10 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Имя</label>
                  <Input value={client.name} onChange={(e) => setC('name', e.target.value)} className="h-10 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Телефон</label>
                  <Input type="tel" value={client.phone} onChange={(e) => setC('phone', e.target.value)} placeholder="+7" className="h-10 mt-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Адрес</label>
                  <Input value={client.address} onChange={(e) => setC('address', e.target.value)} placeholder="Улица, дом" className="h-10 mt-1" />
                </div>
                <label className="col-span-2 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privateHouse}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPrivateHouse(checked);
                      if (checked) {
                        setClient((prev) => ({ ...prev, floor: '', apartment: '', intercom: '' }));
                      }
                    }}
                    className="mt-1 accent-[#00796F] w-4 h-4"
                  />
                  <span className="text-sm"><b>Частный дом</b></span>
                </label>
                {!privateHouse && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Этаж</label>
                      <Input value={client.floor} onChange={(e) => setC('floor', e.target.value)} className="h-10 mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Квартира</label>
                      <Input value={client.apartment} onChange={(e) => setC('apartment', e.target.value)} className="h-10 mt-1" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Код домофона</label>
                      <Input value={client.intercom} onChange={(e) => setC('intercom', e.target.value)} className="h-10 mt-1" />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Дополнительно</label>
                  <textarea
                    value={client.note}
                    onChange={(e) => setC('note', e.target.value)}
                    rows={2}
                    placeholder="Парковка, питомцы, пожелания..."
                    className="w-full mt-1 rounded-lg border border-[#DDEBE8] bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <Button
                  onClick={submitToAmo}
                  className="w-full rounded-xl bg-[#0C7C8C] hover:bg-[#0a6b79] text-white"
                  disabled={!amoReady || amoStatus === 'sending'}
                >
                  {amoStatus === 'ok' ? <Check className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {amoStatus === 'sending'
                    ? 'Отправляем...'
                    : amoStatus === 'ok'
                    ? 'Сделка создана в amoCRM!'
                    : amoStatus === 'err'
                    ? 'Ошибка — попробуй ещё раз'
                    : 'Отправить в amoCRM'}
                </Button>
                {!amoReady && calc.lines.length > 0 && (
                  <p className="text-[11px] text-muted-foreground text-center -mt-1">
                    Для отправки в amoCRM заполни телефон клиента
                  </p>
                )}
                <Button onClick={copyEstimate} variant="outline" className="w-full rounded-xl border-[#DDEBE8]" disabled={calc.lines.length === 0}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Скопировано!' : 'Скопировать смету + данные'}
                </Button>
                <Button variant="outline" onClick={reset} className="w-full rounded-xl border-[#DDEBE8]">
                  Сбросить всё
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
                Минимальный заказ — {fmt(pricing.minOrder)} (учитывается автоматически). Химчистка и окна
                считаются поверх минималки. Коэффициент загрязнённости применяется только
                к уборке по м².
              </p>
            </div>
          </div>
        </main>
      </div>

      {showPricingPanel && (
        <PricingPanel
          pricing={pricing}
          setPricing={setPricing}
          onClose={() => setShowPricingPanel(false)}
          onSave={savePricing}
          onReset={resetPricing}
          saveStatus={pricingSaveStatus}
        />
      )}
    </>
  );
};

/* ====================== ПАНЕЛЬ НАСТРОЕК ЦЕН ====================== */

type PricingPanelProps = {
  pricing: PricingConfig;
  setPricing: (p: PricingConfig) => void;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
  saveStatus: 'idle' | 'saving' | 'ok' | 'err';
};

const PricingField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center justify-between gap-3 py-1">
    <span className="text-xs text-[#0D4D49]/80 truncate">{label}</span>
    <div className="flex items-center gap-1 shrink-0">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-24 h-8 text-sm text-right px-2"
      />
      <span className="text-xs text-muted-foreground">₽</span>
    </div>
  </div>
);

const PricingGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-[#DDEBE8] bg-white p-4">
    <h3 className="font-heading font-bold text-sm text-[#003F3B] mb-2.5">{title}</h3>
    <div className="space-y-1">{children}</div>
  </div>
);

const PricingPanel = ({ pricing, setPricing, onClose, onSave, onReset, saveStatus }: PricingPanelProps) => {
  const update = (mut: (draft: PricingConfig) => void) => {
    const draft: PricingConfig = JSON.parse(JSON.stringify(pricing));
    mut(draft);
    setPricing(draft);
  };

  const cleaningRatesMeta: { key: 'wet' | 'general' | 'repair'; label: string }[] = [
    { key: 'wet', label: 'Влажная' },
    { key: 'general', label: 'Генеральная' },
    { key: 'repair', label: 'После ремонта' },
  ];

  const windowsMeta: { key: keyof PricingConfig['windows']; label: string }[] = [
    { key: 'panoramic', label: 'Панорамная створка (в пол)' },
    { key: 'standard', label: 'Стандартная створка' },
    { key: 'mini', label: 'Мини-окно' },
    { key: 'balconyDoor', label: 'Балконная дверь' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Настройки цен">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative ml-auto w-full max-w-xl h-full bg-[#F7FAF9] shadow-2xl flex flex-col">
        <div className="bg-[#003F3B] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-lg leading-tight">Настройки цен</h2>
            <p className="text-xs text-white/60">Общие для всех менеджеров</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-[#41BFAE]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-5 space-y-4">
          <PricingGroup title="Минимальный заказ">
            <PricingField
              label="Минимальная сумма заказа"
              value={pricing.minOrder}
              onChange={(v) => update((d) => { d.minOrder = v; })}
            />
          </PricingGroup>

          <PricingGroup title="Ставки за м²">
            {cleaningRatesMeta.map(({ key, label }) => (
              <div key={key} className="mb-3 last:mb-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
                {pricing.rates[key].map((b, idx, arr) => (
                  <PricingField
                    key={idx}
                    label={rateBracketLabel(b.upTo, idx, arr)}
                    value={b.price}
                    onChange={(v) => update((d) => { d.rates[key][idx].price = v; })}
                  />
                ))}
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-[#DDEBE8]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Всё включено</p>
              <PricingField
                label="Цена за м²"
                value={pricing.rates.allInclusive}
                onChange={(v) => update((d) => { d.rates.allInclusive = v; })}
              />
            </div>
          </PricingGroup>

          <PricingGroup title="Окна">
            {windowsMeta.map(({ key, label }) => (
              <div key={key} className="mb-2 last:mb-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
                <PricingField
                  label="Обычная уборка"
                  value={pricing.windows[key].usual}
                  onChange={(v) => update((d) => { d.windows[key].usual = v; })}
                />
                <PricingField
                  label="После ремонта"
                  value={pricing.windows[key].repair}
                  onChange={(v) => update((d) => { d.windows[key].repair = v; })}
                />
              </div>
            ))}
          </PricingGroup>

          <PricingGroup title="Дополнительные услуги">
            {extraServices.map((s) => (
              <PricingField
                key={s.id}
                label={s.label}
                value={pricing.extras[s.id] ?? 0}
                onChange={(v) => update((d) => { d.extras[s.id] = v; })}
              />
            ))}
          </PricingGroup>

          <PricingGroup title="Химчистка">
            {dryCleaning.map((s) => (
              <PricingField
                key={s.id}
                label={s.label}
                value={pricing.dry[s.id] ?? 0}
                onChange={(v) => update((d) => { d.dry[s.id] = v; })}
              />
            ))}
          </PricingGroup>

          <PricingGroup title="Шкафы/комоды (фикс)">
            {pricing.wardrobe.map((v, idx) => (
              <PricingField
                key={idx}
                label={`Вариант ${idx + 1}`}
                value={v}
                onChange={(nv) => update((d) => { d.wardrobe[idx] = nv; })}
              />
            ))}
          </PricingGroup>

          <PricingGroup title="Особые случаи">
            <PricingField
              label="Отдельный санузел/ванная"
              value={pricing.special.bathroom}
              onChange={(v) => update((d) => { d.special.bathroom = v; })}
            />
            <PricingField
              label="Обработка плесени"
              value={pricing.special.mold}
              onChange={(v) => update((d) => { d.special.mold = v; })}
            />
            <PricingField
              label="Выезд на Красную Поляну"
              value={pricing.special.polyana}
              onChange={(v) => update((d) => { d.special.polyana = v; })}
            />
          </PricingGroup>
        </div>

        <div className="border-t border-[#DDEBE8] bg-white px-5 py-4 space-y-2">
          {saveStatus !== 'idle' && (
            <p className={`text-xs text-center ${
              saveStatus === 'ok' ? 'text-emerald-700'
              : saveStatus === 'err' ? 'text-red-700'
              : 'text-muted-foreground'
            }`}>
              {saveStatus === 'saving' && 'Сохраняем…'}
              {saveStatus === 'ok' && 'Сохранено для всех ✓'}
              {saveStatus === 'err' && 'Ошибка, попробуйте ещё раз'}
            </p>
          )}
          <Button
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className="w-full rounded-xl bg-[#00796F] hover:bg-[#003F3B] text-white"
          >
            {saveStatus === 'saving' ? 'Сохраняем…' : 'Сохранить для всех'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={onReset}
              className="rounded-xl border-[#DDEBE8] text-[#0D4D49]"
            >
              Сбросить к стандартным
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-[#DDEBE8] text-[#0D4D49]"
            >
              Закрыть
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CALC_PIN = '3715';
const CALC_ACCESS_KEY = 'blesk23_calc_access';

const InternalCalc = () => {
  const [isUnlocked, setIsUnlocked] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(CALC_ACCESS_KEY) === 'granted'
  );
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  if (isUnlocked) return <InternalCalcContent />;

  const submitPin = (event: React.FormEvent) => {
    event.preventDefault();
    if (pin !== CALC_PIN) {
      setPinError(true);
      setPin('');
      return;
    }

    sessionStorage.setItem(CALC_ACCESS_KEY, 'granted');
    setIsUnlocked(true);
  };

  return (
    <>
      <Helmet>
        <title>Вход в калькулятор — Империя Блеска</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAF9] px-4 text-[#0D4D49]">
        <form
          onSubmit={submitPin}
          className="w-full max-w-sm rounded-3xl border border-[#DDEBE8] bg-white p-7 text-center shadow-xl"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Calculator className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Внутренний калькулятор</h1>
          <p className="mt-2 text-sm text-muted-foreground">Введите PIN-код менеджера</p>
          <label htmlFor="calc-pin" className="sr-only">PIN-код</label>
          <Input
            id="calc-pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoFocus
            maxLength={4}
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, '').slice(0, 4));
              setPinError(false);
            }}
            className="mt-6 h-12 text-center text-xl tracking-[0.5em]"
            aria-invalid={pinError}
          />
          {pinError && <p className="mt-2 text-sm text-destructive">Неверный PIN-код</p>}
          <Button type="submit" disabled={pin.length !== 4} className="mt-5 h-12 w-full rounded-xl">
            Открыть калькулятор
          </Button>
        </form>
      </main>
    </>
  );
};

export default InternalCalc;
