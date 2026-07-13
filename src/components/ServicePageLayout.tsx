import { Helmet } from 'react-helmet-async';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowRight, Phone, CheckCircle, MessageCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import maxIcon from '@/assets/max-icon.webp';

interface ServiceItem {
  name: string;
  price: string;
}

interface Advantage {
  title: string;
  description: string;
}

interface FaqItem {
  q: string;
  a: string;
}

interface ServicePageLayoutProps {
  title: string;
  faq?: FaqItem[];
  metaTitle: string;
  metaDescription: string;
  heroDescription: string;
  whatIncluded: string[];
  advantages: Advantage[];
  priceList: ServiceItem[];
  seoText: string;
  relatedServices: { name: string; href: string }[];
}

const ServicePageLayout = ({
  title,
  faq,
  metaTitle,
  metaDescription,
  heroDescription,
  whatIncluded,
  advantages,
  priceList,
  seoText,
  relatedServices,
}: ServicePageLayoutProps) => {
  const whatsappUrl = 'https://wa.me/79002885255';
  const telegramUrl = 'https://t.me/+79002885255';
  const maxUrl = 'https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk';

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://www.blesk23.ru${window.location.pathname}`} />
        {faq && faq.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faq.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            })}
          </script>
        )}
      </Helmet>

      <Header />

      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
              >
                ← На главную
              </Link>

              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                {title}
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed">
                {heroDescription}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="rounded-full px-8 shadow-xl shadow-primary/25 hero-gradient"
                  asChild
                >
                  <a href="tel:+79002885255">
                    <Phone className="w-4 h-4 mr-2" />
                    Заказать уборку
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                  <a href="#prices">
                    Узнать цены
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Что входит */}
        <section className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-10 text-center">
                Что входит в <span className="text-gradient">услугу</span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {whatIncluded.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Преимущества */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-10 text-center">
              Почему <span className="text-gradient">выбирают нас</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {advantages.map((adv, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all group"
                >
                  <h3 className="font-heading text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                    {adv.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{adv.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Цены */}
        <section id="prices" className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/50 to-background" />
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-10 text-center">
              <span className="text-gradient">Цены</span> на услугу
            </h2>
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                {priceList.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-5 ${
                      i < priceList.length - 1 ? 'border-b border-border' : ''
                    } hover:bg-muted/30 transition-colors`}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="font-heading font-bold text-primary whitespace-nowrap ml-4">
                      {item.price}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Точная стоимость рассчитывается после осмотра объекта
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center p-10 rounded-3xl hero-gradient text-primary-foreground shadow-2xl shadow-primary/30">
              <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                Закажите уборку прямо сейчас
              </h2>
              <p className="text-primary-foreground/80 mb-8 text-lg">
                Позвоните нам или напишите в мессенджер — мы ответим в течение 15 минут
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button
                  size="lg"
                  className="rounded-full px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg"
                  asChild
                >
                  <a href="tel:+79002885255">
                    <Phone className="w-4 h-4 mr-2" />
                    +7 900 288-52-55
                  </a>
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">WhatsApp</span>
                </a>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
                >
                  <Send className="w-5 h-5" />
                  <span className="text-sm font-medium">Telegram</span>
                </a>
                <a
                  href={maxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
                >
                  <img src={maxIcon} alt="Max" className="w-5 h-5 rounded" />
                  <span className="text-sm font-medium">Max</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SEO Text */}
        <section className="py-16 relative">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto prose prose-lg text-muted-foreground">
              <div dangerouslySetInnerHTML={{ __html: seoText }} />
            </div>
          </div>
        </section>

        {/* FAQ */}
        {faq && faq.length > 0 && (
          <section className="py-16 relative">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-10">
                Частые вопросы
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {faq.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`q-${i}`}
                    className="rounded-2xl border border-border bg-card px-5"
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
        )}

        {/* Related Services */}
        <section className="py-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-muted/30 to-background" />
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="font-heading text-2xl font-bold mb-6 text-center">Другие услуги</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {relatedServices.map((s, i) => (
                <Link
                  key={i}
                  to={s.href}
                  className="px-5 py-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-sm font-medium hover:text-primary"
                >
                  {s.name}
                </Link>
              ))}
              <Link
                to="/"
                className="px-5 py-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-sm font-medium hover:text-primary"
              >
                Все услуги
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default ServicePageLayout;
