// Пререндер маршрутов для GitHub Pages: каждая страница услуг получает
// собственный index.html (HTTP 200) с корректными title/description/canonical.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const base = 'https://www.blesk23.ru';

const routes = {
  '/': {
    title: 'Империя Блеска — Профессиональный клининг в Сочи',
    description:
      'Клининговая компания «Империя Блеска» — профессиональная уборка квартир, домов и офисов в Сочи. Работаем в Сочи, Адлере и Красной Поляне.',
  },
  '/uborka-kvartir-sochi': {
    title: 'Уборка квартир в Сочи — цены от 3500 ₽ | Империя Блеска',
    description:
      'Профессиональная уборка квартир в Сочи от 3500 ₽. Поддерживающая и генеральная уборка. Выезд в день заказа. Опыт 5+ лет. Звоните: +7 900 288-52-55',
  },
  '/uborka-domov-sochi': {
    title: 'Уборка домов в Сочи — профессионально и быстро | Империя Блеска',
    description:
      'Профессиональная уборка частных домов и коттеджей в Сочи. Генеральная и поддерживающая уборка. Работаем в Сочи, Адлере, Красной Поляне. Звоните: +7 900 288-52-55',
  },
  '/uborka-posle-remonta-sochi': {
    title: 'Уборка после ремонта в Сочи — от 280 ₽/м² | Империя Блеска',
    description:
      'Уборка после ремонта в Сочи от 280 ₽/м². Удалим строительную пыль, плёнку, краску и затирку за 1 день. Точная цена в WhatsApp за 2 минуты. Рейтинг 5.0 — 43 отзыва.',
  },
  '/himchistka-mebeli-sochi': {
    title: 'Химчистка мебели в Сочи на дому — от 400 ₽ | Империя Блеска',
    description:
      'Химчистка диванов, кресел, матрасов, ковров и штор в Сочи на дому. Экстракторный метод, сушка 3–6 часов. Безопасно для детей и животных. Рейтинг 5,0 — 41 отзыв.',
  },
  '/uborka-oficov': {
    title: 'Уборка офисов в Сочи — от 20 ₽/м² | Империя Блеска',
    description:
      'Профессиональная уборка офисов в Сочи от 20 ₽/м². Ежедневная, генеральная уборка. Обслуживание коммерческих объектов. Договор. Звоните: +7 900 288-52-55',
  },
  '/moyka-okon-sochi': {
    title: 'Мойка окон в Сочи — без разводов, от 400 ₽ | Империя Блеска',
    description:
      'Профессиональная мойка окон в Сочи: квартиры, дома, панорамное остекление, балконы, после ремонта. Без разводов, выезд в день обращения. Рейтинг 5,0 — 41 отзыв.',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const template = readFileSync(join(dist, 'index.html'), 'utf8');

for (const [route, meta] of Object.entries(routes)) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${meta.title}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta name="description" content="${esc(meta.description)}" />`,
    );

  const canonical = `<link rel="canonical" href="${base}${route}" />`;
  html = /<link\s+rel="canonical"[\s\S]*?\/?>/.test(html)
    ? html.replace(/<link\s+rel="canonical"[\s\S]*?\/?>/, canonical)
    : html.replace('</head>', `    ${canonical}\n  </head>`);

  // og:title / og:url тоже приводим к странице
  html = html
    .replace(/(<meta\s+property="og:title"\s+content=")[\s\S]*?("\s*\/?>)/, `$1${esc(meta.title)}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[\s\S]*?("\s*\/?>)/, `$1${base}${route}$2`);

  if (route === '/') {
    writeFileSync(join(dist, 'index.html'), html);
  } else {
    const dir = join(dist, route.slice(1));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }
  console.log('prerendered', route);
}
