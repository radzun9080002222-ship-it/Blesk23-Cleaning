import { Sparkles, MapPin, Phone, Mail, MessageCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import maxIcon from '@/assets/max-icon.webp';
import { reachGoal } from '@/lib/metrika';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const serviceLinks = [
    { name: 'Уборка квартир', href: '/uborka-kvartir-sochi' },
    { name: 'Уборка домов', href: '/uborka-domov-sochi' },
    { name: 'Уборка офисов', href: '/uborka-oficov' },
    { name: 'Химчистка мебели', href: '/himchistka-mebeli-sochi' },
    { name: 'После ремонта', href: '/uborka-posle-remonta-sochi' },
  ];

  const companyLinks = [
    { name: 'О компании', href: '/#about' },
    { name: 'Наша команда', href: '/#about' },
    { name: 'Отзывы клиентов', href: '/#reviews' },
  ];

  const legalLinks = [
    { name: 'Политика обработки персональных данных', href: '/privacy' },
    { name: 'Согласие на обработку данных', href: '/consent' },
    { name: 'Реквизиты', href: '/requisites' },
  ];

  return (
    <footer className="bg-foreground text-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <span className="font-heading text-2xl font-extrabold">Империя Блеска</span>
                <p className="text-sm font-medium text-background/60">Клининговая компания</p>
              </div>
            </Link>
            <p className="text-background/70 text-sm leading-relaxed mb-6">
              Профессиональный клининг в Сочи, Адлере и Красной Поляне. Ежедневно с 8:00 до 23:00.
            </p>
            <div className="space-y-3">
              <a
                href="tel:+79002885255"
                onClick={() => reachGoal('phone_click')}
                className="flex items-center gap-3 text-sm text-background/70 hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                +7 900 288-52-55
              </a>
              <a
                href="mailto:imperiableska2025@gmail.com"
                className="flex items-center gap-3 text-sm text-background/70 hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                imperiableska2025@gmail.com
              </a>
              <div className="flex items-center gap-3 text-sm text-background/70">
                <MapPin className="w-4 h-4" />
                Адрес обслуживания: г. Сочи, ул. Донская, 12
              </div>
              <p className="text-xs leading-relaxed text-background/50">
                ООО «ИМПЕРИЯ БЛЕСКА» · ИНН 2367029343 · ОГРН 1232300006608
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold mb-6">Услуги</h4>
            <ul className="space-y-3">
              {serviceLinks.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="text-sm text-background/70 hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold mb-6">Компания</h4>
            <ul className="space-y-3">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-background/70 hover:text-primary transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold mb-6">Документы</h4>
            <ul className="space-y-3">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="text-sm text-background/70 hover:text-primary transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-background/50">
              © {currentYear} Империя Блеска. Все права защищены.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://wa.me/79002885255"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => reachGoal('messenger_click')}
                className="flex items-center gap-2 text-sm text-background/50 hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
              <a
                href="https://t.me/+79002885255"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => reachGoal('messenger_click')}
                className="flex items-center gap-2 text-sm text-background/50 hover:text-primary transition-colors"
              >
                <Send className="w-4 h-4" />
                Telegram
              </a>
              <a
                href="https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => reachGoal('messenger_click')}
                className="flex items-center gap-2 text-sm text-background/50 hover:text-primary transition-colors"
              >
                <img src={maxIcon} alt="Max" className="w-4 h-4 rounded" />
                Max
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
