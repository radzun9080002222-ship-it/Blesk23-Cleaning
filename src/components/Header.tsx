import { useState, useEffect } from 'react';
import { Menu, X, Phone, Sparkles, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logoEmpire from '@/assets/logo-empire.svg';
import { reachGoal } from '@/lib/metrika';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'О нас', href: '/#about' },
    { name: 'Цены', href: '/#pricing' },
    { name: 'Контакты', href: '/#contacts' },
  ];

  const serviceLinks = [
    { name: 'Уборка квартир', href: '/uborka-kvartir-sochi' },
    { name: 'Уборка домов', href: '/uborka-domov-sochi' },
    { name: 'Уборка офисов', href: '/uborka-oficov' },
    { name: 'Уборка после ремонта', href: '/uborka-posle-remonta-sochi' },
    { name: 'Химчистка мебели', href: '/himchistka-mebeli-sochi' },
    { name: 'Мойка окон', href: '/moyka-okon-sochi' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-background/80 backdrop-blur-xl shadow-lg border-b border-primary/10'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <img src={logoEmpire} alt="Империя Блеска" className="h-10 sm:h-12 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {/* Services dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsServicesOpen(true)}
              onMouseLeave={() => setIsServicesOpen(false)}
            >
              <button className="relative px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-1">
                Услуги
                <ChevronDown className={`w-4 h-4 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full group-hover:w-8 transition-all duration-300" />
              </button>
              <div
                className={`absolute top-full left-0 mt-1 w-56 rounded-xl bg-card border border-border shadow-xl transition-all duration-200 ${
                  isServicesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                }`}
              >
                <div className="py-2">
                  {serviceLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="relative px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                {link.name}
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full group-hover:w-8 transition-all duration-300" />
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <a
              href="tel:+79002885255"
              onClick={() => reachGoal('phone_click')}
              className="flex items-center gap-2 text-base font-extrabold text-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-5 h-5" />
              +7 900 288-52-55
            </a>
            <Button className="rounded-full px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow hero-gradient" asChild>
              <a href="/#contacts">Заказать уборку</a>
            </Button>
          </div>

          <button
            className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <div
          id="mobile-navigation"
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? 'max-h-[500px] pb-6' : 'max-h-0'
          }`}
        >
          <nav className="flex flex-col gap-2 pt-4 border-t border-border">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Услуги</p>
            {serviceLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="border-t border-border mt-2 pt-2" />
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <a
              href="tel:+79002885255"
              onClick={() => reachGoal('phone_click')}
              className="px-4 py-3 flex items-center gap-2 font-extrabold text-foreground"
            >
              <Phone className="w-5 h-5" />
              +7 900 288-52-55
            </a>
            <Button className="mt-2 rounded-full hero-gradient" asChild>
              <a href="/#contacts">Заказать уборку</a>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
