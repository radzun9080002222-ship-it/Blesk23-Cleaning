import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import serviceApartments from '@/assets/service-apartments.webp';
import serviceOffices from '@/assets/service-offices.webp';
const serviceWindows = '/images/okna/hero.webp';
import serviceDrycleaning from '@/assets/service-drycleaning.webp';
import serviceRenovation from '@/assets/service-renovation.webp';
import serviceExtra from '@/assets/service-extra.webp';

const services = [
  {
    title: 'Уборка квартир и домов',
    price: 'от 3 500 ₽',
    image: serviceApartments,
    link: '/uborka-kvartir-sochi',
  },
  {
    title: 'Уборка офисов',
    price: 'от 20 ₽/м²',
    image: serviceOffices,
    link: '/uborka-oficov',
  },
  {
    title: 'Мойка окон',
    price: 'от 400 ₽',
    image: serviceWindows,
    link: '/moyka-okon-sochi',
  },
  {
    title: 'Химчистка мебели',
    price: 'от 1 500 ₽',
    image: serviceDrycleaning,
    link: '/himchistka-mebeli-sochi',
  },
  {
    title: 'Уборка после ремонта',
    price: 'от 5 000 ₽',
    image: serviceRenovation,
    link: '/uborka-posle-remonta-sochi',
  },
  {
    title: 'Дополнительные услуги',
    price: 'от 400 ₽',
    image: serviceExtra,
    link: null,
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Наши услуги
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Полный спектр
            <span className="text-gradient"> клининговых услуг</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Скидка новому клиенту <span className="text-primary font-bold">10%</span>
          </p>
        </div>

        {/* Photo Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const content = (
              <div
                key={index}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-300"
              >
                {/* Photo */}
                <img
                  src={service.image}
                  alt={service.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-300" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="font-heading text-xl md:text-2xl font-bold text-white mb-1 drop-shadow-lg">
                    {service.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-foreground bg-primary/90 px-3 py-1 rounded-lg text-sm">
                      {service.price}
                    </span>
                    {service.link && (
                      <span className="flex items-center gap-1 text-white/80 group-hover:text-white text-sm font-medium transition-colors">
                        Подробнее
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );

            return service.link ? (
              <Link key={index} to={service.link} className="block">
                {content}
              </Link>
            ) : (
              <div key={index}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
