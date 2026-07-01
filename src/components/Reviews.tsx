import { Star, Quote } from 'lucide-react';

const Reviews = () => {
  const reviews = [
    {
      name: 'Анна К.',
      text: 'Заказывали генеральную уборку квартиры после ремонта. Ребята справились на отлично! Всё блестит, даже швы на плитке отмыли. Рекомендую!',
      rating: 5,
      service: 'Уборка после ремонта',
    },
    {
      name: 'Дмитрий П.',
      text: 'Пользуемся услугами регулярно для офиса. Всегда пунктуальны, качество стабильно высокое. Очень удобно, что работают без выходных.',
      rating: 5,
      service: 'Уборка офиса',
    },
    {
      name: 'Марина С.',
      text: 'Химчистка дивана — просто волшебство! Диван как новый. Приехали в тот же день, работали аккуратно. Спасибо огромное!',
      rating: 5,
      service: 'Химчистка мебели',
    },
    {
      name: 'Олег В.',
      text: 'Отличная компания! Заказывали мытьё окон в загородном доме. Быстро, чисто, без разводов. Цены адекватные.',
      rating: 5,
      service: 'Мытьё окон',
    },
    {
      name: 'Елена Т.',
      text: 'Поддерживающая уборка каждую неделю — лучшее решение. Прихожу домой, а там чистота и свежесть. Команда очень приятная!',
      rating: 5,
      service: 'Поддерживающая уборка',
    },
    {
      name: 'Сергей М.',
      text: 'Убирали апартаменты перед заездом гостей. Сделали всё за 3 часа, качество на высоте. Буду обращаться ещё!',
      rating: 4,
      service: 'Генеральная уборка',
    },
  ];

  return (
    <section id="reviews" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Отзывы
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Что говорят
            <span className="text-gradient"> наши клиенты</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Более 1000 довольных клиентов в Сочи, Адлере и Красной Поляне
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {review.text}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-heading font-bold text-sm">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.service}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href="https://yandex.ru/maps/org/21130859655/reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/30 text-primary font-medium hover:bg-primary/5 transition-colors"
          >
            Все отзывы о нас в Яндекс Картах — рейтинг 5.0
          </a>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
