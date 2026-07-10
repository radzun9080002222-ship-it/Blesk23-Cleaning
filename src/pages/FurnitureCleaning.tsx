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
  Leaf,
  Droplet,
  AirVent,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import StickyMobileCTA from '@/components/repair/StickyMobileCTA';
import FurnitureCalculator, {
  FURNITURE_ITEMS,
} from '@/components/furniture/FurnitureCalculator';
import FurnitureLeadForm from '@/components/furniture/FurnitureLeadForm';
import { reachGoal } from '@/lib/metrika';
import maxIcon from '@/assets/max-icon.webp';

const heroImg = { url: '/images/himchistka/hero.webp' };
const heroVideo = { url: '/images/himchistka/video-hero.mp4' };
const komandaImg = { url: '/images/himchistka/komanda.webp' };
const oborudovanieImg = { url: '/images/himchistka/oborudovanie.webp' };
const doImg = { url: '/images/himchistka/do-posle-divan-do.webp' };
const posleImg = { url: '/images/himchistka/do-posle-divan-posle-alt.webp' };
const process1 = { url: '/images/himchistka/process-1.webp' };
const process2 = { url: '/images/himchistka/process-2.webp' };
const process3 = { url: '/images/himchistka/process-3.webp' };
const result1 = { url: '/images/himchistka/result-1.webp' };

const USE_HERO_VIDEO = false; // переключить в true когда будет HD-версия

const phone = '+7 900 288-52-55';
const phoneHref = 'tel:+79002885255';
const waUrl = 'https://wa.me/79002885255';
const tgUrl = 'https://t.me/+79002885255';
const maxUrl =
  'https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk';
const reviewsUrl = 'https://yandex.ru/maps/org/21130859655/reviews/';

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

const steps = [
  { n: '01', t: 'Заявка и расчёт', d: 'Отвечаем за 2 минуты, фиксируем цену и время.' },
  { n: '02', t: 'Выезд мастера', d: 'Осмотр ткани и подбор средства под обивку.' },
  { n: '03', t: 'Чистка экстрактором', d: 'Глубокое вытягивание грязи + точечная работа с пятнами.' },
  { n: '04', t: 'Сушка 3–6 часов', d: 'Принимаете работу — мебель готова к использованию.' },
];

const whatWeClean = [
  'Диваны',
  'Угловые диваны',
  'Кресла',
  'Стулья с мягкой обивкой',
  'Матрасы',
  'Подушки',
  'Пуфы и банкетки',
  'Изголовья кроватей',
  'Ковры и ковролин',
  'Шторы и портьеры',
  'Автокресла и автосиденья',
  'Детские коляски',
];

const advantages = [
  {
    icon: Truck,
    t: 'Выезд на дом со своим оборудованием',
    d: 'Профессиональные экстракторы Karcher — не нужно никуда везти мебель.',
  },
  {
    icon: AirVent,
    t: 'Экстракторный метод',
    d: 'Глубокая чистка с вытягиванием грязи. Сушка 3–6 часов.',
  },
  {
    icon: Leaf,
    t: 'Гипоаллергенные средства',
    d: 'Безопасно для детей и животных. Без агрессивной химии.',
  },
  {
    icon: Droplet,
    t: 'Удаляем любые пятна',
    d: 'Кофе, вино, кровь, жир, косметика, чернила.',
  },
  {
    icon: Wind,
    t: 'Устраняем запахи',
    d: 'Табак, домашние животные, сырость, плесень.',
  },
  {
    icon: BadgeCheck,
    t: 'Гарантия результата',
    d: 'Не устроило — бесплатно доработаем по тому же чек-листу.',
  },
];

const reviews = [
  {
    name: 'Анна К.',
    text: 'Чистили угловой диван — пятна от кофе и следы от животных. Результат — как из магазина. Высох за 4 часа, никаких запахов химии. Спасибо!',
  },
  {
    name: 'Дмитрий П.',
    text: 'Заказывал химчистку матраса и двух кресел. Приехали вовремя, всё аккуратно, мебель не двигали по квартире. Цена совпала с расчётом.',
  },
  {
    name: 'Мария В.',
    text: 'Думала, диван уже не спасти после 5 лет с детьми. Девочки сделали невозможное — выглядит как новый. Рекомендую всем в Сочи.',
  },
  {
    name: 'Игорь Ш.',
    text: 'Чистили салон авто — два детских автокресла. Запах табака ушёл полностью. Работают чисто, без разводов.',
  },
  {
    name: 'Ольга М.',
    text: 'Заказывала химчистку ковра и штор на дому. Очень довольна — приехали со своим оборудованием, сделали за 2 часа. Цена честная.',
  },
  {
    name: 'Сергей Л.',
    text: 'Профессионалы. Объяснили, почему именно экстракторный метод, показали грязную воду из мебели. Реально работает.',
  },
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
  { q: 'Сколько сохнет диван после химчистки?', a: '3–6 часов, вечером уже можно пользоваться.' },
  { q: 'Сколько стоит химчистка дивана?', a: 'Двухместный — от 4 000 ₽, трёхместный — от 5 500 ₽, угловой — от 7 500 ₽.' },
  { q: 'Уберёте запах и пятна?', a: 'Да, экстракторный метод вытягивает загрязнения из глубины ткани: пятна, запахи, аллергены.' },
  { q: 'Это безопасно для детей и животных?', a: 'Да, средства гипоаллергенны и полностью вымываются из ткани.' },
  { q: 'Чистите матрасы, ковры, шторы?', a: 'Да: матрасы, ковры, шторы, кресла, стулья — всё на дому, без вывоза.' },
];

const FurnitureCleaning = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const formRef = useRef<HTMLDivElement>(null);

  const total = useMemo(
    () =>
      FURNITURE_ITEMS.reduce(
        (s, it) => s + (counts[it.id] || 0) * it.price,
        0
      ),
    [counts]
  );

  const composition = useMemo(
    () =>
      FURNITURE_ITEMS.filter((it) => (counts[it.id] || 0) > 0)
        .map((it) => `${it.name} × ${counts[it.id]}`)
        .join('; '),
    [counts]
  );

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToCalc = () => {
    document
      .getElementById('calc')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Империя Блеска — химчистка мебели в Сочи',
    image: heroImg.url,
    telephone: '+79002885255',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Сочи',
      addressCountry: 'RU',
    },
    priceRange: 'от 400 ₽',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      ratingCount: '55',
      reviewCount: '48',
    },
    areaServed: ['Сочи', 'Адлер', 'Красная Поляна'],
    openingHours: 'Mo-Su 08:00-23:00',
  };

  return (
    <>
      <Helmet>
        <title>
          Химчистка мебели в Сочи на дому — от 400 ₽ | Империя Блеска
        </title>
        <meta
          name="description"
          content="Химчистка диванов, кресел, матрасов, ковров и штор в Сочи на дому. Экстракторный метод, сушка 3–6 часов. Безопасно для детей и животных. Рейтинг 5,0 — 48 отзывов."
        />
        <link
          rel="canonical"
          href="https://www.blesk23.ru/himchistka-mebeli-sochi"
        />
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
        <script type="application/ld+json">
          {JSON.stringify(localBusinessJsonLd)}
        </script>
      </Helmet>

      <Header />

      <main className="bg-[#F7FAF9] text-[#0D4D49]">
        {/* HERO */}
        <section className="relative overflow-hidden">
          {USE_HERO_VIDEO ? (
            <video
              src={heroVideo.url}
              poster={heroImg.url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <img
              src={heroImg.url}
              alt="Мастер «Империи Блеска» с экстрактором Karcher чистит диван в Сочи"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#003F3B]/90 via-[#003F3B]/70 to-[#003F3B]/30" />

          <div className="relative container mx-auto px-4 pt-28 md:pt-36 pb-20 md:pb-28">
            <div className="max-w-2xl text-white">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6"
              >
                ← На главную
              </Link>
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                Химчистка мебели в Сочи —{' '}
                <span className="text-[#41BFAE]">
                  мебель станет как новая уже сегодня
                </span>
              </h1>
              <p className="mt-5 text-white/85 text-base md:text-lg leading-relaxed max-w-xl">
                Профессиональная химчистка диванов, кресел, матрасов, ковров и
                штор на дому. Удаляем пятна, запахи и аллергены. Точная цена и
                дата — за 2 минуты. Сушка 3–6 часов.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-[#F5C518] text-[#F5C518]" />
                  5,0 · 48 отзывов в Яндексе
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  Выезд в день обращения
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <Leaf className="w-3.5 h-3.5" />
                  Безопасно для детей и животных
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Работаем по договору
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={scrollToCalc}
                  className="rounded-full px-7 bg-[#41BFAE] hover:bg-[#41BFAE]/90 text-[#003F3B] font-semibold shadow-xl"
                >
                  Рассчитать за 2 минуты
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 bg-[#25D366] hover:bg-[#1ebe5b] text-white"
                >
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => reachGoal('messenger_click')}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 bg-[#229ED9] hover:bg-[#1d8dc2] text-white"
                >
                  <a
                    href={tgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => reachGoal('messenger_click')}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Telegram
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 bg-white text-[#003F3B] hover:bg-white/90"
                >
                  <a
                    href={maxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => reachGoal('messenger_click')}
                  >
                    <img src={maxIcon} alt="Max" className="w-5 h-5 rounded mr-2" />
                    Max
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-7 bg-transparent border-white/50 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href={phoneHref} onClick={() => reachGoal('phone_click')}>
                    <Phone className="w-5 h-5 mr-2" />
                    Позвонить
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
              <FurnitureCalculator
                counts={counts}
                setCounts={setCounts}
                onFix={scrollToForm}
              />
              <div ref={formRef}>
                <FurnitureLeadForm
                  composition={composition}
                  totalLabel={total > 0 ? `от ${fmt(total)}` : ''}
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

            <div className="max-w-3xl mx-auto">
              <BeforeAfterSlider
                before={doImg.url}
                after={posleImg.url}
                caption="Диван — глубокая чистка"
              />
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Все фото — наши клиенты в Сочи. Скоро добавим матрасы, кресла и ковры.
            </p>
          </div>
        </section>

        {/* PROCESS */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-3">
              Как проходит химчистка
            </h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
              Экстракторный метод — глубокая чистка с вытягиванием грязи из
              волокон. Эффективнее ручной в 10 раз.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {steps.map((s) => (
                <div
                  key={s.n}
                  className="p-6 rounded-2xl bg-white border border-[#DDEBE8]"
                >
                  <div className="text-primary font-heading font-bold text-2xl">
                    {s.n}
                  </div>
                  <h3 className="font-heading text-lg font-bold mt-2">{s.t}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {s.d}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[process1, process2, process3].map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={`Процесс химчистки мебели — шаг ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full aspect-[4/5] object-cover rounded-2xl border border-[#DDEBE8]"
                />
              ))}
            </div>
          </div>
        </section>

        {/* WHAT WE CLEAN */}
        <section className="py-16 md:py-24 bg-white border-y border-[#DDEBE8]">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Что мы чистим
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {whatWeClean.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 p-4 rounded-2xl bg-[#F7FAF9] border border-[#DDEBE8]"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Все ткани: текстиль, микрофибра, велюр, жаккард, флок, кожа, экокожа.
            </p>
          </div>
        </section>

        {/* WHY US */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Почему выбирают «Империю Блеска»
            </h2>

            <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 mb-6">
              <img
                src={komandaImg.url}
                alt="Мастер «Империи Блеска» с экстрактором Karcher"
                loading="lazy"
                decoding="async"
                className="w-full h-full max-h-[420px] object-cover rounded-2xl border border-[#DDEBE8]"
              />
              <img
                src={oborudovanieImg.url}
                alt="Профессиональное оборудование Karcher для химчистки мебели"
                loading="lazy"
                decoding="async"
                className="w-full h-full max-h-[420px] object-cover rounded-2xl border border-[#DDEBE8]"
              />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {advantages.map(({ icon: Icon, t, d }) => (
                <div
                  key={t}
                  className="p-6 rounded-2xl bg-white border border-[#DDEBE8]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EAF4F1] flex items-center justify-center text-primary mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold">{t}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RESULT */}
        <section className="py-16 md:py-24 bg-white border-y border-[#DDEBE8]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <img
                src={result1.url}
                alt="Чистый диван после химчистки — без разводов и запаха"
                loading="lazy"
                decoding="async"
                className="w-full aspect-[4/5] md:aspect-[4/5] object-cover rounded-3xl border border-[#DDEBE8]"
              />
              <div>
                <h2 className="font-heading text-3xl md:text-4xl font-bold">
                  Мебель как новая — без разводов и запаха
                </h2>
                <p className="text-muted-foreground mt-4 leading-relaxed">
                  После экстракторной чистки ткань возвращает первоначальный цвет,
                  ворс восстанавливается, а запахи уходят полностью. Сушка занимает
                  3–6 часов — и мебелью можно снова пользоваться.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={scrollToCalc}
                    className="rounded-full px-6 hero-gradient text-white"
                  >
                    Заказать химчистку
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full px-6 border-[#DDEBE8]"
                  >
                    <a href={phoneHref} onClick={() => reachGoal('phone_click')}>
                      <Phone className="w-4 h-4 mr-2" />
                      {phone}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-[#F5C518] text-[#F5C518]"
                  />
                ))}
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                5,0 · 48 отзывов в Яндексе
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((r) => (
                <div
                  key={r.name}
                  className="p-6 rounded-2xl border border-[#DDEBE8] bg-white"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-[#F5C518] text-[#F5C518]"
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-[#0D4D49]">
                    {r.text}
                  </p>
                  <p className="text-sm font-semibold mt-4">{r.name}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-[#DDEBE8]"
              >
                <a href={reviewsUrl} target="_blank" rel="noopener noreferrer">
                  Читать отзывы в Яндексе
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* GEO */}
        <section className="py-12 md:py-16 bg-white border-y border-[#DDEBE8]">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
              Выезжаем по всему Большому Сочи
            </h2>
            <p className="text-muted-foreground mb-6">
              Работаем ежедневно 8:00–23:00. Выезд в день обращения.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {districts.map((d) => (
                <span
                  key={d}
                  className="px-4 py-2 rounded-full bg-[#F7FAF9] border border-[#DDEBE8] text-sm font-medium"
                >
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
                Закажите химчистку прямо сейчас
              </h2>
              <p className="text-white/80 mt-3 text-base md:text-lg">
                Ответим в течение 15 минут — назовём точную цену и время.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 bg-[#41BFAE] hover:bg-[#41BFAE]/90 text-[#003F3B]"
                >
                  <a href={phoneHref} onClick={() => reachGoal('phone_click')}>
                    <Phone className="w-5 h-5 mr-2" />
                    {phone}
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 bg-[#25D366] hover:bg-[#1ebe5b] text-white"
                >
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => reachGoal('messenger_click')}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 bg-[#229ED9] hover:bg-[#1d8dc2] text-white"
                >
                  <a
                    href={tgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => reachGoal('messenger_click')}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Telegram
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 bg-white text-[#003F3B] hover:bg-white/90"
                >
                  <a
                    href={maxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => reachGoal('messenger_click')}
                  >
                    <img src={maxIcon} alt="Max" className="w-5 h-5 rounded mr-2" />
                    Max
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SEO TEXT */}
        <section className="py-12 md:py-16 bg-white border-t border-[#DDEBE8]">
          <details className="container mx-auto px-4 max-w-3xl">
            <summary className="cursor-pointer text-sm font-semibold text-primary mb-4">
              Подробнее о химчистке мебели в Сочи
            </summary>
            <article className="text-muted-foreground space-y-4 mt-4 [&_h2]:text-[#0D4D49] [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h3]:text-[#0D4D49] [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_p]:leading-relaxed">
              <h2>Химчистка мебели в Сочи на дому</h2>
              <p>
                Мягкая мебель ежедневно собирает пыль, шерсть домашних животных,
                следы еды и напитков. Регулярная химчистка не только возвращает
                ткани свежий вид, но и уничтожает пылевых клещей, бактерии и
                аллергены. «Империя Блеска» выполняет химчистку диванов, кресел,
                матрасов, ковров и штор в Сочи с выездом на дом — без необходимости
                разбирать и куда-то везти мебель.
              </p>
              <h3>Экстракторный метод чистки</h3>
              <p>
                Мы используем профессиональные экстракторы Karcher. Чистящий
                состав наносится на ткань, растворяет загрязнения, после чего
                машина с большой силой вытягивает грязь вместе с раствором. Метод
                эффективнее ручной чистки в 10 раз — и при этом мебель высыхает
                за 3–6 часов.
              </p>
              <h3>Какую мебель и ткани мы чистим</h3>
              <p>
                Диваны и угловые диваны, кресла, стулья с мягкой обивкой, матрасы
                с обеих сторон, подушки, изголовья кроватей, пуфы, банкетки,
                ковры и ковролин, шторы и портьеры, автокресла и детские коляски.
                Работаем со всеми тканями: текстиль, микрофибра, велюр, жаккард,
                флок, кожа, экокожа.
              </p>
              <h3>Удаление пятен и запахов</h3>
              <p>
                Справляемся со сложными пятнами — кофе, вино, кровь, жир,
                косметика, чернила. Полностью убираем запахи табака, домашних
                животных, сырости и плесени. Если результат не устроит — бесплатно
                доработаем по тому же чек-листу.
              </p>
              <p>
                Чтобы заказать химчистку мебели в Сочи на дом — позвоните
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
      <StickyMobileCTA />
    </>
  );
};

export default FurnitureCleaning;
