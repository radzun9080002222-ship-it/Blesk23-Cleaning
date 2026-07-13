import { ArrowRight, Star, Shield, Clock, Phone, Wrench, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/steam-cleaning.webp';
import { reachGoal } from '@/lib/metrika';

const Hero = () => {
  const features = [
    { icon: Shield, text: 'Гарантия качества' },
    { icon: Clock, text: 'Расчёт за 2 минуты' },
    { icon: Star, text: 'Рейтинг 5.0' },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="container mx-auto px-4 pt-32 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Сочи · Адлер · Красная Поляна</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              Профессиональная уборка
              <br />
              <span className="text-gradient">в Сочи и Адлере</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Квартиры, дома и офисы. Сразу назовём ближайшую дату и предварительную
              стоимость — без долгих анкет и скрытых доплат.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border shadow-sm"
                >
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="rounded-full px-8 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 hero-gradient" asChild>
                <a
                  href="https://wa.me/79002885255?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%A5%D0%BE%D1%87%D1%83%20%D1%83%D0%B7%D0%BD%D0%B0%D1%82%D1%8C%20%D1%81%D1%82%D0%BE%D0%B8%D0%BC%D0%BE%D1%81%D1%82%D1%8C%20%D1%83%D0%B1%D0%BE%D1%80%D0%BA%D0%B8."
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track-placement="hero"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Рассчитать в WhatsApp
                </a>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 hover:-translate-y-0.5 transition-transform" asChild>
                <a href="tel:+79002885255" data-track-placement="hero">
                  <Phone className="w-4 h-4 mr-2" />
                  Позвонить
                </a>
              </Button>
            </div>
            <a
              href="#pricing"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              onClick={() => reachGoal('contact_scroll', { placement: 'hero_prices' })}
            >
              Посмотреть цены
              <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </div>

          <div className="relative lg:pl-12">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border">
              <img
                src={heroImage}
                alt="Профессиональная уборка - Империя Блеска"
                width="1200"
                height="911"
                loading="eager"
                decoding="async"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center justify-center bg-[#F6F6F6] rounded-xl p-3 text-center min-h-[64px]">
                    <span className="block font-heading text-2xl font-bold text-primary">5+</span>
                    <span className="text-xs text-muted-foreground">Лет опыта</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-[#F6F6F6] rounded-xl p-3 text-center min-h-[64px]">
                    <span className="block font-heading text-2xl font-bold text-secondary">1000+</span>
                    <span className="text-xs text-muted-foreground">Клиентов</span>
                  </div>
                  <div className="flex items-center justify-center bg-[#F6F6F6] rounded-xl p-2 min-h-[64px] overflow-hidden">
                    <iframe
                      src="https://yandex.ru/sprav/widget/rating-badge/21130859655?type=rating"
                      width="150"
                      height="50"
                      frameBorder="0"
                      loading="lazy"
                      title="Рейтинг Империя Блеска на Яндекс Картах"
                      className="max-w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 px-4 py-2 bg-card rounded-xl shadow-lg border border-border animate-float">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Проф. средства</span>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 lg:left-8 px-4 py-2 bg-card rounded-xl shadow-lg border border-border animate-float" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-secondary" />
                <span className="text-sm font-medium">Застрахованы</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
