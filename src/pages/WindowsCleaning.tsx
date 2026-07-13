import { useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Link } from 'react-router-dom';
import {
  Phone,
  MessageCircle,
  Send,
  CheckCircle2,
  Star,
  ShieldCheck,
  Sparkles,
  Truck,
  Wind,
  Droplet,
  BadgeCheck,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import WindowsCalculator, {
  WINDOW_ITEMS,
  WindowTariff,
  calcTotal,
} from '@/components/windows/WindowsCalculator';
import WindowsLeadForm from '@/components/windows/WindowsLeadForm';
import { reachGoal } from '@/lib/metrika';
import maxIcon from '@/assets/max-icon.webp';

const heroImg = { url: '/images/okna/hero.webp' };
const heroVideo = { url: '/images/okna/video-hero.mp4' };
const panoramaImg = { url: '/images/okna/panorama.webp' };
const process1 = { url: '/images/okna/process-1.webp' };

const beforeAfter = [
  {
    before: '/images/okna/do-posle-okno2-do.webp',
    after: '/images/okna/do-posle-okno2-posle.webp',
    caption: 'Окна после ремонта — сняли плёнку и пыль',
  },
  {
    before: '/images/okna/do-posle-okno3-do.webp',
    after: '/images/okna/do-posle-okno3-posle.webp',
    caption: 'Окно и подоконник — после стройки',
  },
];

const USE_HERO_VIDEO = false;

const phone = '+7 900 288-52-55';
const phoneHref = 'tel:+79002885255';
const waUrl = 'https://wa.me/79002885255';
const tgUrl = 'https://t.me/+79002885255';
const maxUrl =
  'https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk';
const reviewsUrl = 'https://yandex.ru/maps/org/21130859655/reviews/';

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

const tariffLabels: Record<WindowTariff, string> = {
  general: 'Генеральная / влажная',
  repair: 'После ремонта',
};

const steps = [
  { n: '01', t: 'Заявка и расчёт', d: 'Считаем стоимость за 2 минуты и согласовываем время.' },
  { n: '02', t: 'Выезд мастера', d: 'Оценка загрязнения, доступа и типа стеклопакетов.' },
  { n: '03', t: 'Мойка без разводов', d: 'Профсредства, сгон, пар. Внутри и снаружи, рамы и подоконники.' },
  { n: '04', t: 'Приём работы', d: 'Проверяете каждое окно — гарантия результата.' },
];

const whatWeClean = [
  'Окна квартир и домов',
  'Панорамное остекление (в пол)',
  'Балконы и лоджии',
  'Стеклопакеты',
  'Мансардные и глухие окна',
  'Стеклянные двери и перегородки',
  'Витрины',
  'Мойка после ремонта (плёнка, цемент, краска)',
];

const advantages = [
  {
    icon: Truck,
    t: 'Выезд в день обращения',
    d: 'Работаем по всему Большому Сочи — приезжаем со своим оборудованием.',
  },
  {
    icon: Building2,
    t: 'Труднодоступные места и высота',
    d: 'Моем глухие окна, панорамное остекление и высокие витрины.',
  },
  {
    icon: Droplet,
    t: 'Без разводов и подтёков',
    d: 'Профсредства, сгон и пар — стёкла прозрачные при любом свете.',
  },
  {
    icon: ShieldCheck,
    t: 'Безопасно для рам и стеклопакетов',
    d: 'Без агрессивной химии. Не повреждаем уплотнители и фурнитуру.',
  },
  {
    icon: Sparkles,
    t: 'Убираем следы стройки',
    d: 'Цемент, краска, штукатурка, защитная плёнка после ремонта.',
  },
  {
    icon: BadgeCheck,
    t: 'Гарантия результата',
    d: 'Не устроило — бесплатно домоем по тому же чек-листу.',
  },
];

const reviews = [
  { name: 'Ольга С.', text: 'Помыли панорамные окна в новой квартире на 14 этаже — после ремонта были в плёнке и цементе. Сделали идеально, без единого развода. Очень довольны!' },
  { name: 'Игорь М.', text: 'Заказывал генеральную мойку окон и балкона. Приехали вовремя, отработали аккуратно, рамы и подоконники тоже идеально. Цена совпала с расчётом.' },
  { name: 'Анна П.', text: 'Сняли защитную плёнку с 8 окон после строителей — сами не справились. Мастер всё убрал за 3 часа, стёкла как новые.' },
  { name: 'Дмитрий К.', text: 'Мыли окна в загородном доме, в том числе высокие глухие — со своей лестницей. Подъехали в день обращения. Рекомендую.' },
  { name: 'Мария В.', text: 'Очень аккуратные ребята. Не намочили ни рамы, ни подоконник, ни пол. Окна прозрачные — наконец-то видно море :)' },
  { name: 'Сергей Л.', text: 'Заказывал мойку витрины кафе — сделали утром до открытия. Чисто, быстро, по договору. Будем сотрудничать постоянно.' },
];

const districts = [
  'Центральный район',
  'Адлер',
  'Сириус',
  'Красная Поляна',
  'Хоста',
  'Дагомыс',
  'Лазаревское',
  'Кудепста',
  'Мацеста',
];

const faqExtra = [
  { q: 'Сколько стоит помыть окна?', a: 'От 400 ₽ за мини-окно, стандартная створка — от 500 ₽, панорамная — от 1 200 ₽. Точная цена — в калькуляторе на этой странице.' },
  { q: 'Моете панорамное остекление на высоте?', a: 'Да, работаем с панорамными окнами и труднодоступными местами со специальным оборудованием.' },
  { q: 'Останутся ли разводы?', a: 'Нет. Моем профессиональными средствами и скребками, используем парогенераторы — стекло прозрачное, без подтёков.' },
  { q: 'Убираете следы ремонта с окон?', a: 'Да: плёнку, скотч, краску, цемент. Для окон после ремонта отдельный тариф — от 750 ₽ за створку.' },
  { q: 'Как быстро приедете?', a: 'В день обращения. Работаем ежедневно с 8:00 до 23:00, без выходных.' },
];

const WindowsCleaning = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tariff, setTariff] = useState<WindowTariff>('general');
  const [film, setFilm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const total = useMemo(() => calcTotal(counts, tariff, film), [counts, tariff, film]);

  const composition = useMemo(
    () =>
      WINDOW_ITEMS.filter((it) => (counts[it.id] || 0) > 0)
        .map((it) => `${it.name} × ${counts[it.id]}`)
        .join('; ') + (tariff === 'repair' && film ? '; плёнка ×2' : ''),
    [counts, tariff, film],
  );

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const scrollToCalc = () =>
    document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Империя Блеска — мойка окон в Сочи',
    image: heroImg.url,
    telephone: '+79002885255',
    address: { '@type': 'PostalAddress', addressLocality: 'Сочи', addressCountry: 'RU' },
    priceRange: 'от 400 ₽',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '5.0', ratingCount: '55', reviewCount: '48' },
    areaServed: ['Сочи', 'Адлер', 'Красная Поляна'],
    openingHours: 'Mo-Su 08:00-23:00',
  };

  return (
    <>
      <Helmet>
        <title>Мойка окон в Сочи — без разводов, от 400 ₽ | Империя Блеска</title>
        <meta
          name="description"
          content="Профессиональная мойка окон в Сочи: квартиры, дома, панорамное остекление, балконы, после ремонта. Без разводов, выезд в день обращения. Рейтинг 5,0 — 48 отзывов."
        />
        <link rel="canonical" href="https://www.blesk23.ru/moyka-okon-sochi" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqExtra.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          })}
        </script>
        <script type="application/ld+json">{JSON.stringify(localBusinessJsonLd)}</script>
      </Helmet>

      <Header />

      <main className="bg-[#F7FAF9] text-[#0D4D49]">
        {/* HERO */}
        <section className="relative overflow-hidden">
          {USE_HERO_VIDEO ? (
            <video
              src={heroVideo.url}
              poster={heroImg.url}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <img
              src={heroImg.url}
              alt="Мастер «Империи Блеска» моет окно в Сочи"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#003F3B]/90 via-[#003F3B]/70 to-[#003F3B]/30" />

          <div className="relative container mx-auto px-4 pt-28 md:pt-36 pb-20 md:pb-28">
            <div className="max-w-2xl text-white">
              <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6">
                ← На главную
              </Link>
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                Мойка окон в Сочи —{' '}
                <span className="text-[#41BFAE]">прозрачно, без разводов</span>
              </h1>
              <p className="mt-5 text-white/85 text-base md:text-lg leading-relaxed max-w-xl">
                Моем окна, панорамное остекление, балконы и лоджии, стеклянные двери. Профессионально, на дому, без разводов и подтёков. Точная цена — за 2 минуты.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-[#F5C518] text-[#F5C518]" />
                  5,0 · 48 отзывов
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  Выезд в день обращения
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <Building2 className="w-3.5 h-3.5" />
                  Труднодоступные места
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Работаем по договору
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={scrollToCalc} className="rounded-full px-7 bg-[#41BFAE] hover:bg-[#41BFAE]/90 text-[#003F3B] font-semibold shadow-xl">
                  Рассчитать за 2 минуты
                </Button>
                <Button asChild size="lg" className="rounded-full px-7 bg-[#25D366] hover:bg-[#1ebe5b] text-white">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5 mr-2" />WhatsApp
                  </a>
                </Button>
                <Button asChild size="lg" className="rounded-full px-7 bg-[#229ED9] hover:bg-[#1d8dc2] text-white">
                  <a href={tgUrl} target="_blank" rel="noopener noreferrer">
                    <Send className="w-5 h-5 mr-2" />Telegram
                  </a>
                </Button>
                <Button asChild size="lg" className="rounded-full px-7 bg-white text-[#003F3B] hover:bg-white/90">
                  <a href={maxUrl} target="_blank" rel="noopener noreferrer">
                    <img src={maxIcon} alt="Max" className="w-5 h-5 rounded mr-2" />Max
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-7 bg-transparent border-white/50 text-white hover:bg-white/10 hover:text-white">
                  <a href={phoneHref} onClick={() => reachGoal('phone_click')}>
                    <Phone className="w-5 h-5 mr-2" />Позвонить
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CALCULATOR */}
        <section id="calc" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                Узнайте цену за 2 минуты
              </h2>
              <p className="text-muted-foreground mt-3">
                Фиксируем стоимость до начала работ.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 max-w-6xl mx-auto items-start">
              <WindowsCalculator
                counts={counts}
                setCounts={setCounts}
                tariff={tariff}
                setTariff={setTariff}
                film={film}
                setFilm={setFilm}
                onFix={scrollToForm}
              />
              <div ref={formRef}>
                <WindowsLeadForm
                  composition={composition}
                  totalLabel={total > 0 ? `от ${fmt(total)}` : ''}
                  tariffLabel={tariffLabels[tariff]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* BEFORE / AFTER */}
        <section className="py-16 md:py-24 bg-white border-y border-[#DDEBE8]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                Реальные объекты в Сочи — до и после
              </h2>
              <p className="text-muted-foreground mt-3">
                Двигайте ползунок пальцем, чтобы сравнить.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {beforeAfter.map((p) => (
                <BeforeAfterSlider
                  key={p.before}
                  before={p.before}
                  after={p.after}
                  caption={p.caption}
                />
              ))}
            </div>
          </div>
        </section>

        {/* WHAT WE CLEAN */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Что моем
            </h2>
            <div className="grid md:grid-cols-[1fr_1fr] gap-8 items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {whatWeClean.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 p-4 rounded-2xl bg-white border border-[#DDEBE8]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <img
                src={panoramaImg.url}
                alt="Панорамное остекление в пол — мойка окон в Сочи"
                loading="lazy"
                decoding="async"
                className="w-full aspect-[4/3] object-cover rounded-3xl border border-[#DDEBE8]"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Моем в труднодоступных местах и на высоте — с профессиональным оборудованием.
            </p>
          </div>
        </section>

        {/* PROCESS */}
        <section className="py-16 md:py-24 bg-white border-y border-[#DDEBE8]">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-3">
              Как проходит мойка
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
              Профсредства, сгон и пар — чистота без подтёков и разводов.
            </p>

            <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 items-center">
              <img
                src={process1.url}
                alt="Процесс мойки окна — рука мастера в перчатке на створке"
                loading="lazy"
                decoding="async"
                className="w-full aspect-[4/3] object-cover rounded-3xl border border-[#DDEBE8]"
              />
              <div className="grid sm:grid-cols-2 gap-4">
                {steps.map((s) => (
                  <div key={s.n} className="p-5 rounded-2xl bg-[#F7FAF9] border border-[#DDEBE8]">
                    <div className="text-primary font-heading font-bold text-2xl">{s.n}</div>
                    <h3 className="font-heading text-lg font-bold mt-2">{s.t}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WHY US */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Почему выбирают «Империю Блеска»
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {advantages.map(({ icon: Icon, t, d }) => (
                <div key={t} className="p-6 rounded-2xl bg-white border border-[#DDEBE8]">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF4F1] flex items-center justify-center text-primary mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold">{t}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section className="py-16 md:py-24 bg-white border-y border-[#DDEBE8]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#F5C518] text-[#F5C518]" />
                ))}
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                5,0 · 48 отзывов в Яндексе
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((r) => (
                <div key={r.name} className="p-6 rounded-2xl border border-[#DDEBE8] bg-[#F7FAF9]">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#F5C518] text-[#F5C518]" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-[#0D4D49]">{r.text}</p>
                  <p className="text-sm font-semibold mt-4">{r.name}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button asChild variant="outline" className="rounded-full border-[#DDEBE8]">
                <a href={reviewsUrl} target="_blank" rel="noopener noreferrer">
                  Читать отзывы в Яндексе
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* GEO */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
              Выезжаем по всему Большому Сочи
            </h2>
            <p className="text-muted-foreground mb-6">
              Работаем ежедневно 8:00–23:00. Выезд в день обращения.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {districts.map((d) => (
                <span key={d} className="px-4 py-2 rounded-full bg-white border border-[#DDEBE8] text-sm font-medium">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto rounded-3xl bg-[#003F3B] text-white p-10 md:p-14 text-center shadow-2xl">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                Закажите мойку окон прямо сейчас
              </h2>
              <p className="text-white/80 mt-3 text-base md:text-lg">
                Ответим в течение 15 минут — назовём точную цену и время.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="rounded-full px-7 bg-[#41BFAE] hover:bg-[#41BFAE]/90 text-[#003F3B]">
                  <a href={phoneHref} onClick={() => reachGoal('phone_click')}>
                    <Phone className="w-5 h-5 mr-2" />{phone}
                  </a>
                </Button>
                <Button asChild size="lg" className="rounded-full px-7 bg-[#25D366] hover:bg-[#1ebe5b] text-white">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5 mr-2" />WhatsApp
                  </a>
                </Button>
                <Button asChild size="lg" className="rounded-full px-7 bg-[#229ED9] hover:bg-[#1d8dc2] text-white">
                  <a href={tgUrl} target="_blank" rel="noopener noreferrer">
                    <Send className="w-5 h-5 mr-2" />Telegram
                  </a>
                </Button>
                <Button asChild size="lg" className="rounded-full px-7 bg-white text-[#003F3B] hover:bg-white/90">
                  <a href={maxUrl} target="_blank" rel="noopener noreferrer">
                    <img src={maxIcon} alt="Max" className="w-5 h-5 rounded mr-2" />Max
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SEO */}
        <section className="py-12 md:py-16 bg-white border-t border-[#DDEBE8]">
          <details className="container mx-auto px-4 max-w-3xl">
            <summary className="cursor-pointer text-sm font-semibold text-primary mb-4">
              Подробнее о мойке окон в Сочи
            </summary>
            <article className="text-muted-foreground space-y-4 mt-4 [&_h2]:text-[#0D4D49] [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h3]:text-[#0D4D49] [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_p]:leading-relaxed">
              <h2>Мойка окон в Сочи на дому</h2>
              <p>
                «Империя Блеска» моет окна в Сочи, Адлере и Красной Поляне на дому и
                в офисе. Работаем с обычными стеклопакетами, панорамным остеклением в
                пол, балконами и лоджиями, стеклянными дверьми и перегородками,
                витринами и мансардными окнами. Используем профессиональные средства,
                сгон и парогенератор — стёкла остаются прозрачными при любом освещении,
                без разводов и подтёков.
              </p>
              <h3>Генеральная мойка и мойка после ремонта</h3>
              <p>
                Генеральная (влажная) мойка подходит для регулярного ухода: моем стёкла
                с двух сторон, рамы, подоконники и фурнитуру. Мойка после ремонта —
                это снятие защитной плёнки, удаление следов цемента, штукатурки,
                краски и монтажной пены без повреждения стеклопакета.
              </p>
              <h3>Труднодоступные места и высота</h3>
              <p>
                Моем глухие окна с доступом по лестнице, панорамное остекление и
                высокие витрины. Работаем безопасно, с соблюдением техники
                безопасности, и не оставляем следов на рамах и подоконниках.
              </p>
              <p>
                Чтобы заказать мойку окон в Сочи — позвоните
                +7&nbsp;900&nbsp;288-52-55 или напишите в WhatsApp, Telegram или Max.
              </p>
            </article>
          </details>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Частые вопросы
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqExtra.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-2xl border border-[#DDEBE8] bg-white px-5"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Related */}
        <section className="py-12 bg-white border-t border-[#DDEBE8]">
          <div className="container mx-auto px-4">
            <h2 className="font-heading text-2xl font-bold text-center mb-6">
              Другие услуги
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { name: 'Уборка квартир', href: '/uborka-kvartir-sochi' },
                { name: 'Уборка домов', href: '/uborka-domov-sochi' },
                { name: 'Уборка после ремонта', href: '/uborka-posle-remonta-sochi' },
                { name: 'Химчистка мебели', href: '/himchistka-mebeli-sochi' },
                { name: 'Уборка офисов', href: '/uborka-oficov' },
                { name: '← На главную', href: '/' },
              ].map((s) => (
                <Link
                  key={s.href}
                  to={s.href}
                  className="px-5 py-2.5 rounded-xl bg-white border border-[#DDEBE8] hover:border-primary/40 hover:text-primary transition-colors text-sm font-medium"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default WindowsCleaning;
