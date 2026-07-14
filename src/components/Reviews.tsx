import { useEffect, useRef } from 'react';
import { ArrowUpRight, MapPinned, MessageSquarePlus, Quote, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reachGoal } from '@/lib/metrika';

const YANDEX_REVIEWS_URL = 'https://yandex.ru/maps/org/21130859655/reviews/';
const YANDEX_REVIEW_CREATE_URL = `${YANDEX_REVIEWS_URL}?add-review=true`;
const YANDEX_REVIEWS_WIDGET_URL = 'https://yandex.ru/maps-reviews-widget/21130859655?comments';

const featuredReviews = [
  {
    name: 'Максим Мантуров',
    date: '14 июля',
    service: 'Генеральная уборка дома',
    text: 'Очень качественный клининг! Выполнены все пожелания.',
  },
  {
    name: 'Ульяна Ч.',
    date: '30 апреля',
    service: 'Генеральная уборка и химчистка',
    text: 'Уборку сделали быстро и качественно. Обязательно обратимся ещё!',
  },
  {
    name: 'Tohir I.',
    date: '10 марта',
    service: 'Уборка после ремонта',
    text: 'После ремонта команда справилась со всеми задачами и получила рекомендацию клиента.',
  },
];

const Reviews = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') return;

    let tracked = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!tracked && entry.isIntersecting) {
          tracked = true;
          reachGoal('reviews_open', { placement: 'home_reviews' });
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="reviews" className="relative overflow-hidden py-20 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/40 to-background" />
      <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-40 bottom-20 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Отзывы подтверждены Яндексом
          </span>
          <h2 className="mb-4 font-heading text-4xl font-bold md:text-5xl">
            Реальные впечатления
            <span className="text-gradient"> наших клиентов</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Выбрали несколько свежих отзывов. Полная лента ниже загружается напрямую из Яндекс Карт и обновляется автоматически.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
          <div className="space-y-4">
            <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MapPinned className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-heading text-lg font-bold">Империя Блеска</p>
                  <p className="text-sm text-muted-foreground">Актуальный рейтинг в Яндекс Картах</p>
                </div>
              </div>
              <iframe
                src="https://yandex.ru/sprav/widget/rating-badge/21130859655?type=rating"
                width="150"
                height="50"
                frameBorder="0"
                loading="lazy"
                title="Актуальный рейтинг Империи Блеска на Яндекс Картах"
                className="max-w-full"
              />
            </div>

            {featuredReviews.map((review) => (
              <a
                key={review.name}
                href={YANDEX_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                onClick={() =>
                  reachGoal('review_card_click', {
                    placement: 'home_reviews',
                    reviewer: review.name,
                  })
                }
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <Quote className="h-8 w-8 text-primary/25" />
                  <div className="flex gap-0.5" aria-label="Оценка 5 из 5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-secondary text-secondary" />
                    ))}
                  </div>
                </div>
                <p className="mb-5 text-base leading-relaxed text-foreground">«{review.text}»</p>
                <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
                  <div>
                    <p className="font-heading font-bold">{review.name}</p>
                    <p className="text-sm text-muted-foreground">{review.service} · {review.date}</p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              </a>
            ))}

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <Button variant="outline" size="lg" className="h-12 rounded-full" asChild>
                <a
                  href={YANDEX_REVIEWS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => reachGoal('reviews_all_click', { placement: 'home_reviews' })}
                >
                  Все отзывы
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" className="hero-gradient h-12 rounded-full" asChild>
                <a
                  href={YANDEX_REVIEW_CREATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => reachGoal('review_create_click', { placement: 'home_reviews' })}
                >
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Оставить отзыв
                </a>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-xl shadow-primary/5 lg:sticky lg:top-24">
            <iframe
              src={YANDEX_REVIEWS_WIDGET_URL}
              title="Отзывы об Империи Блеска на Яндекс Картах"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-[560px] w-full rounded-[1.15rem] border-0 sm:h-[640px] lg:h-[720px]"
            />
            <a
              href="https://yandex.ru/maps/org/imperiya_bleska/21130859655/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-center text-xs text-muted-foreground transition-colors hover:text-primary"
              onClick={() => reachGoal('reviews_all_click', { placement: 'yandex_widget_caption' })}
            >
              Империя Блеска на карте Сочи — Яндекс Карты
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
