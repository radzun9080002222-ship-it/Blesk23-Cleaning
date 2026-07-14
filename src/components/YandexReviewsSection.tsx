import { useEffect, useRef } from 'react';
import { ArrowUpRight, MapPinned, MessageSquarePlus, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reachGoal } from '@/lib/metrika';

const YANDEX_REVIEWS_URL = 'https://yandex.ru/maps/org/21130859655/reviews/';
const YANDEX_REVIEW_CREATE_URL = `${YANDEX_REVIEWS_URL}?add-review=true`;
const YANDEX_REVIEWS_WIDGET_URL = 'https://yandex.ru/maps-reviews-widget/21130859655?comments';
const YANDEX_RATING_WIDGET_URL =
  'https://yandex.ru/sprav/widget/rating-badge/21130859655?type=rating';

type YandexReviewsSectionProps = {
  title: string;
  description: string;
  placement: string;
};

const YandexReviewsSection = ({
  title,
  description,
  placement,
}: YandexReviewsSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') return;

    let tracked = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!tracked && entry.isIntersecting) {
          tracked = true;
          reachGoal('reviews_open', { placement });
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [placement]);

  return (
    <section
      ref={sectionRef}
      className="border-y border-[#DDEBE8] bg-white py-16 md:py-24"
    >
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Отзывы подтверждены Яндексом
          </span>
          <h2 className="font-heading text-3xl font-bold md:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {description}
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-[#DDEBE8] bg-[#F7FAF9] p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapPinned className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-xl font-bold">Империя Блеска в Яндекс Картах</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Рейтинг и количество отзывов загружаются напрямую из карточки компании — без ручных цифр на сайте.
              </p>
              <iframe
                src={YANDEX_RATING_WIDGET_URL}
                width="150"
                height="50"
                frameBorder="0"
                loading="lazy"
                title="Актуальный рейтинг Империи Блеска на Яндекс Картах"
                className="mt-5 max-w-full"
              />
              <div className="mt-5 flex items-center gap-2 border-t border-[#DDEBE8] pt-5 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
                Обновляется автоматически
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Button variant="outline" size="lg" className="h-12 rounded-full" asChild>
                <a
                  href={YANDEX_REVIEWS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => reachGoal('reviews_all_click', { placement })}
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
                  onClick={() => reachGoal('review_create_click', { placement })}
                >
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Оставить отзыв
                </a>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#DDEBE8] bg-white p-2 shadow-xl shadow-primary/5">
            <iframe
              src={YANDEX_REVIEWS_WIDGET_URL}
              title="Отзывы об Империи Блеска на Яндекс Картах"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-[560px] w-full rounded-[1.15rem] border-0 sm:h-[640px]"
            />
            <a
              href={YANDEX_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-center text-xs text-muted-foreground transition-colors hover:text-primary"
              onClick={() =>
                reachGoal('reviews_all_click', { placement: `${placement}_widget_caption` })
              }
            >
              Открыть полную ленту в Яндекс Картах
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default YandexReviewsSection;
