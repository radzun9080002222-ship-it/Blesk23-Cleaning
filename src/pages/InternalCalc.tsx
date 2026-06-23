import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Copy, Check, AlertTriangle, Calculator, Send, TrendingUp, Settings2, Settings, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

const MIN_ORDER = 6000;

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

const InternalCalc = () => {
  const [type, setType] = useState<CleaningType>('wet');
  const [area, setArea] = useState<number>(0);
  const [dirt, setDirt] = useState<number>(1.0);

  const [win, setWin] = useState({ panoramic: 0, standard: 0, mini: 0, balconyDoor: 0 });
  const [panoramicPrice, setPanoramicPrice] = useState<number>(windowPrices.panoramic.usual);
  const [windowFilm, setWindowFilm] = useState(false);

  const [extras, setExtras] = useState<Record<string, number>>({});
  const [wardrobeExtra, setWardrobeExtra] = useState<0 | 2000 | 2500>(0);
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
    } catch {}
  };

  const resetEconConf = () => {
    const base = econDefaultValues();
    setEconConf(base);
    try {
      localStorage.removeItem(ECON_LS_KEY);
    } catch {}
  };

  const isRepair = type === 'repair';
  const filmActive = isRepair && windowFilm;

  const switchType = (t: CleaningType) => {
    setType(t);
    setCleanersOverride(null);
    setPanoramicPrice(t === 'repair' ? windowPrices.panoramic.repair : windowPrices.panoramic.usual);
    if (t !== 'repair') setWindowFilm(false);
  };

  const calc = useMemo(() => {
    const lines: { label: string; sum: number }[] = [];

    // Основная уборка (коэффициент загрязнённости — только сюда)
    const rate = rateFor(type, area);
    const k = clampDirt(dirt);
    const baseRaw = area > 0 ? Math.round(area * rate * k) : 0;
    const base = area > 0 ? Math.max(baseRaw, MIN_ORDER) : 0;
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
      (key === 'panoramic' ? panoramicPrice : isRepair ? windowPrices[key].repair : windowPrices[key].usual) * filmK;
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
      if (count > 0) lines.push({ label: `${s.label} × ${count} ${s.unit}`, sum: count * s.price });
    });
    if (wardrobeExtra > 0) lines.push({ label: 'Шкафы/комоды внутри (фикс)', sum: wardrobeExtra });

    // Химчистка
    let dryTotal = 0;
    dryCleaning.forEach((s) => {
      const count = dry[s.id] || 0;
      if (count > 0) {
        const sum = count * s.price;
        dryTotal += sum;
        lines.push({ label: `Химчистка: ${s.label} × ${count}`, sum });
      }
    });

    if (bathrooms > 0) lines.push({ label: `Отдельный санузел/ванная × ${bathrooms}`, sum: bathrooms * 6000 });
    if (mold) lines.push({ label: 'Обработка плесени', sum: 1500 });
    if (polyana) lines.push({ label: 'Выезд на Красную Поляну', sum: 2000 });

    const total = lines.reduce((a, l) => a + l.sum, 0);
    return { lines, total, dryTotal };
  }, [type, area, dirt, win, panoramicPrice, filmActive, isRepair, extras, wardrobeExtra, dry, mold, polyana, bathrooms]);

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
    } catch {}
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
                  const baseP = k === 'panoramic' ? panoramicPrice : isRepair ? windowPrices[k].repair : windowPrices[k].usual;
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
                Минимальный заказ — 6 000 ₽ (учитывается автоматически). Химчистка и окна
                считаются поверх минималки. Коэффициент загрязнённости применяется только
                к уборке по м².
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default InternalCalc;
