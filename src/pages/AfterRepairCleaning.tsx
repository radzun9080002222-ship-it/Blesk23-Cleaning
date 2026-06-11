import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Send, CheckCircle2, Star, ShieldCheck, FileText, Sparkles } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import RepairCalculator from '@/components/repair/RepairCalculator';
import RepairLeadForm from '@/components/repair/RepairLeadForm';
import StickyMobileCTA from '@/components/repair/StickyMobileCTA';
import { reachGoal } from '@/lib/metrika';

const hero = '/images/repair/hero_gostinaya.jpg';

const phone = '+7 900 288-52-55';
const waUrl = 'https://wa.me/79002885255';
const tgUrl = 'https://t.me/+79002885255';
const reviewsUrl = 'https://yandex.ru/maps/org/21130859655/reviews/';

const beforeAfterItems = [
  { before: '/images/repair/01_koridor_do.jpg', after: '/images/repair/01_koridor_posle.jpg', caption: 'Коридор, дом 180 м²' },
  { before: '/images/repair/02_gostinaya_do.jpg', after: '/images/repair/02_gostinaya_posle.jpg', caption: 'Гостиная, ЖК в Сочи' },
  { before: '/images/repair/03_kran_do.jpg', after: '/images/repair/03_kran_posle.jpg', caption: 'Сантехника: штукатурка → блеск' },
  { before: '/images/repair/04_podokonnik_do.jpg', after: '/images/repair/04_podokonnik_posle.jpg', caption: 'Подоконник: плёнка и пыль' },
  { before: '/images/repair/05_okna_do.jpg', after: '/images/repair/05_okna_posle.jpg', caption: 'Окна: строительная пыль' },
  { before: '/images/repair/06_spalnya_do.jpg', after: '/images/repair/06_spalnya_posle.jpg', caption: 'Спальня после ремонта' },
  { before: '/images/repair/07_kuhnya_do.jpg', after: '/images/repair/07_kuhnya_posle.jpg', caption: 'Кухня, ЖК в Сочи' },
];

const galleryImages = [
  '/images/repair/gostinaya2.jpg',
  '/images/repair/vannaya.jpg',
  '/images/repair/kuhnya.jpg',
  '/images/repair/spalnya.jpg',
  '/images/repair/komnata_dom.jpg',
];

const whatIncluded = [
  'Удаление строительной пыли со всех поверхностей: стены, потолок, пол',
  'Снятие защитной плёнки и малярного скотча',
  'Удаление следов краски, цемента, затирки и монтажной пены',
  'Мытьё окон, рам и подоконников',
  'Полировка сантехники и плитки',
  'Протирка розеток и выключателей',
  'Мытьё дверей и плинтусов',
  'Вынос строительного мусора (по согласованию)',
];

const steps = [
  { n: '01', t: 'Заявка', d: 'Отвечаем за 2 минуты с ценой и датой' },
  { n: '02', t: 'Выезд', d: 'Приезжаем с HEPA-пылесосами, парогенератором и химией' },
  { n: '03', t: 'Уборка за 1 день', d: 'Принимаете работу по чек-листу' },
  { n: '04', t: 'Оплата', d: 'Только после приёмки. Чек и договор' },
];

const reviews = [
  {
    name: 'Tohir I.',
    text: 'Заказал клининг после ремонта! Девчонки молодцы, справились с поставленной задачей на 100%! Спасибо огромное! Теперь и у меня есть феи чистоты. Рекомендую!',
  },
  {
    name: 'Мариям Тохчукова',
    text: 'Это самая лучшая клининговая компания в Сочи. Хотела после ремонта уже чистоту и порядок, но самой тяжело было убраться. Попросила их. Всё блестит, сверкает. Видна работа грамотных мастеров!',
  },
  {
    name: 'Ирина Я.',
    text: 'Огромная благодарность девочкам, которые убирали папе дом. Дом был очень грязный — справились великолепно, всё отмыли, даже постирали и повесили шторы. Большой объём работы за день, приехали со всем оборудованием и химией.',
  },
];

const faq = [
  {
    q: 'Сколько стоит уборка после ремонта?',
    a: 'От 280 ₽/м², минимальный заказ — 6 000 ₽. Точную цену называем за 2 минуты в WhatsApp.',
  },
  {
    q: 'Как быстро приедете?',
    a: 'Обычно в течение 24 часов. Работаем ежедневно 8:00–20:00 по всем районам Сочи: центр, Адлер, Сириус, Хоста, Дагомыс, Лазаревское, Красная Поляна.',
  },
  {
    q: 'Что нужно от меня?',
    a: 'Только доступ в помещение — присутствовать необязательно. По окончании принимаете работу по чек-листу.',
  },
  {
    q: 'Уберёте краску и цемент с плитки и стекла?',
    a: 'Да. Используем профессиональную химию и специальные скребки — без царапин на покрытиях.',
  },
  {
    q: 'Работаете с юридическими лицами?',
    a: 'Да: договор, безналичный расчёт, закрывающие документы.',
  },
  {
    q: 'А если останутся недочёты?',
    a: 'Бесплатно доделаем по чек-листу приёмки. Платите только после того, как всё устроит.',
  },
];

const AfterRepairCleaning = () => {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Империя Блеска',
    image: 'https://www.blesk23.ru/images/repair/hero_gostinaya.jpg',
    telephone: '+79002885255',
    email: 'imperiableska2025@gmail.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'ул. Донская, 12',
      addressLocality: 'Сочи',
      addressCountry: 'RU',
    },
    priceRange: 'от 280 ₽/м²',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '5.0', reviewCount: '43' },
    areaServed: ['Сочи', 'Адлер', 'Красная Поляна'],
    openingHours: 'Mo-Su 08:00-20:00',
  };

  return (
    <>
      <Helmet>
        <title>Уборка после ремонта в Сочи — от 280 ₽/м² | Империя Блеска</title>
        <meta
          name="description"
          content="Уборка после ремонта в Сочи от 280 ₽/м². Удалим строительную пыль, плёнку, краску и затирку за 1 день. Точная цена в WhatsApp за 2 минуты. Рейтинг 5.0 — 43 отзыва."
        />
        <link rel="canonical" href="https://www.blesk23.ru/uborka-posle-remonta-sochi" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(localBusinessJsonLd)}</script>
      </Helmet>

      <Header />

      <main className="bg-[#F7FAF9] text-[#0D4D49]">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <img
            src={hero}
            alt="Чистая гостиная после ремонта в Сочи"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#003F3B]/90 via-[#003F3B]/70 to-[#003F3B]/20" />
          <div className="relative container mx-auto px-4 pt-28 md:pt-36 pb-20 md:pb-28">
            <div className="max-w-2xl text-white">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-6"
              >
                ← На главную
              </Link>
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                Уборка после ремонта в Сочи —{' '}
                <span className="text-[#41BFAE]">заедете в чистую квартиру через 1 день</span>
              </h1>
              <p className="mt-5 text-white/85 text-base md:text-lg leading-relaxed max-w-xl">
                Уберём строительную пыль, плёнку, следы краски и затирки. Точная цена
                и дата — за 2 минуты в WhatsApp.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-[#F5C518] text-[#F5C518]" />
                  Рейтинг 5.0 · 43 отзыва в Яндексе
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  От 280 ₽/м²
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs md:text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                  <FileText className="w-3.5 h-3.5" />
                  Работаем по договору
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full px-7 bg-[#41BFAE] hover:bg-[#41BFAE]/90 text-[#003F3B] font-semibold shadow-xl"
                >
                  <a href="#calc">Рассчитать стоимость</a>
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
              </div>
            </div>
          </div>
        </section>

        {/* CALCULATOR + FORM */}
        <section id="calc" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                Узнайте цену за 2 минуты
              </h2>
              <p className="text-muted-foreground mt-3">
                Фиксируем стоимость до начала работ — цена не изменится, даже если уборка
                займёт дольше.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 max-w-6xl mx-auto">
              <RepairCalculator />
              <RepairLeadForm />
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

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {beforeAfterItems.map((it, i) => (
                <BeforeAfterSlider
                  key={i}
                  before={it.before}
                  after={it.after}
                  caption={it.caption}
                />
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Все фото — наши объекты, без стока и фотошопа.
            </p>
          </div>
        </section>

        {/* WHAT INCLUDED */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Что входит в уборку после ремонта
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {whatIncluded.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#DDEBE8]"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICES */}
        <section id="prices" className="py-16 md:py-24 bg-white border-y border-[#DDEBE8]">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Честные цены за м²
            </h2>
            <div className="rounded-2xl border border-[#DDEBE8] overflow-hidden">
              {[
                ['Уборка после ремонта (до 99 м²)', '300 ₽/м²'],
                ['Уборка после ремонта (от 100 м²)', '280 ₽/м²'],
                ['Генеральная уборка', 'от 250 ₽/м²'],
                ['Тариф «Всё включено»', '450 ₽/м²'],
              ].map(([name, price], i, arr) => (
                <div
                  key={name}
                  className={`flex items-center justify-between p-5 bg-white ${
                    i < arr.length - 1 ? 'border-b border-[#DDEBE8]' : ''
                  }`}
                >
                  <span className="font-medium">{name}</span>
                  <span className="font-heading font-bold text-primary whitespace-nowrap ml-4">
                    {price}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Минимальный заказ — 6 000 ₽. Окна после ремонта: стандартная створка —
              от 750 ₽, панорамная — от 1 500 ₽, балконная дверь — 1 500 ₽.
            </p>
            <div className="mt-4 flex items-start gap-2 text-sm text-[#0D4D49]">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p>
                Фиксируем стоимость до начала работ — цена не изменится, даже если уборка
                займёт дольше.
              </p>
            </div>
          </div>
        </section>

        {/* HOW WE WORK */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Как мы работаем
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map((s) => (
                <div
                  key={s.n}
                  className="p-6 rounded-2xl bg-white border border-[#DDEBE8]"
                >
                  <div className="text-primary font-heading font-bold text-2xl">{s.n}</div>
                  <h3 className="font-heading text-lg font-bold mt-2">{s.t}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {s.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section className="py-16 md:py-24 bg-white border-y border-[#DDEBE8]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                Рейтинг 5.0 — 43 отзыва в Яндексе
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {reviews.map((r) => (
                <div
                  key={r.name}
                  className="p-6 rounded-2xl border border-[#DDEBE8] bg-[#F7FAF9]"
                >
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
              <Button
                asChild
                variant="outline"
                className="rounded-full border-[#DDEBE8]"
              >
                <a
                  href={reviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Читать все отзывы в Яндексе
                </a>
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-12">
              {galleryImages.map((g, i) => (
                <img
                  key={i}
                  src={g}
                  alt="Чистый объект после уборки"
                  loading="lazy"
                  className="w-full aspect-square object-cover rounded-2xl border border-[#DDEBE8]"
                />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
              Частые вопросы
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faq.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`q-${i}`}
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

        {/* FINAL CTA */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto rounded-3xl bg-[#003F3B] text-white p-10 md:p-14 text-center shadow-2xl">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                Квартира готова к жизни — завтра.
              </h2>
              <p className="text-white/80 mt-3 text-base md:text-lg">
                Напишите нам — ответим за 2 минуты.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
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
                  className="rounded-full px-7 bg-white text-[#003F3B] hover:bg-white/90"
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
                  className="rounded-full px-7 bg-[#41BFAE] hover:bg-[#41BFAE]/90 text-[#003F3B]"
                >
                  <a href={`tel:${phone.replace(/\s|-/g, '')}`} onClick={() => reachGoal('phone_click')}>
                    <Phone className="w-5 h-5 mr-2" />
                    {phone}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SEO TEXT */}
        <section className="py-12 md:py-16 bg-white border-t border-[#DDEBE8]">
          <article className="container mx-auto px-4 max-w-3xl text-muted-foreground space-y-4 [&_h2]:text-[#0D4D49] [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h3]:text-[#0D4D49] [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_p]:leading-relaxed">
            <h2>Уборка после ремонта в Сочи — профессионально и без следов</h2>
            <p>
              Ремонт — это всегда обновление и свежесть. Но после завершения
              строительных работ в помещении остаётся множество загрязнений: строительная
              пыль, остатки цемента и затирки, следы краски и монтажной пены, разводы на
              стёклах и плитке. Самостоятельно справиться с послестроительной уборкой
              крайне сложно — нужны специальные средства, скребки и промышленные пылесосы
              с HEPA-фильтрами.
            </p>
            <p>
              Клининговая компания «Империя Блеска» в Сочи профессионально выполняет
              уборку после ремонта в квартирах, новостройках, частных домах и офисах.
              Команда работает по всему городу и Большому Сочи: центр, Адлер, Сириус,
              Хоста, Дагомыс, Лазаревское, Красная Поляна. Минимальная стоимость заказа —
              6 000 ₽, цена за метр от 280 ₽.
            </p>
            <h3>Этапы послестроительной уборки</h3>
            <p>
              Сначала мы удаляем крупный строительный мусор и пылесосим все поверхности
              промышленным пылесосом. Затем проводим влажную уборку с применением
              специальных составов для удаления цемента, затирки и краски. После этого
              моем окна, двери, сантехнику, плитку и фурнитуру. Финальный этап — приёмка
              работ по чек-листу: если найдены недочёты, мы устраняем их бесплатно.
            </p>
            <h3>Сколько стоит уборка после ремонта в новостройке</h3>
            <p>
              Цена уборки новостройки зависит от площади и степени загрязнения. До 99 м² —
              300 ₽/м², от 100 м² — 280 ₽/м². Окна после ремонта оплачиваются отдельно:
              створка от 750 ₽, панорамное окно от 1 500 ₽. Фиксируем стоимость до начала
              работ — цена не меняется, даже если уборка длится дольше запланированного.
            </p>
            <h3>Почему выбирают «Империю Блеска»</h3>
            <p>
              Рейтинг компании 5.0 в Яндекс Картах — 43 отзыва реальных клиентов. Работаем
              ежедневно с 8:00 до 20:00, выезд возможен в течение суток. Принимаем оплату
              наличными, картой и безналом, работаем с юридическими лицами по договору.
              Чтобы заказать послеремонтную уборку в Сочи — позвоните по номеру
              +7 900 288-52-55 или напишите в WhatsApp.
            </p>
          </article>
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
                { name: 'Химчистка мебели', href: '/himchistka-mebeli-sochi' },
                { name: 'Уборка офисов', href: '/uborka-oficov' },
                { name: 'На главную', href: '/' },
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

export default AfterRepairCleaning;
