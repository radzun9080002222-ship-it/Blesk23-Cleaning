import { useState, useEffect } from 'react';
import { Menu, X, Phone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoEmpire from '@/assets/logo-empire.svg';
import { reachGoal } from '@/lib/metrika';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Услуги', href: '#services' },
    { name: 'О нас', href: '#about' },
    { name: 'Цены', href: '#pricing' },
    { name: 'Контакты', href: '#contacts' },
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
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <img src={logoEmpire} alt="Империя Блеска" className="h-10 sm:h-12 w-auto" />
          </a>

          <nav className="hidden lg:flex items-center gap-1">
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
              className="flex items-center gap-2 text-base font-bold text-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-5 h-5" />
              +7 900 288-52-55
            </a>
            <Button className="rounded-full px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow hero-gradient" asChild>
              <a href="#contacts">Заказать уборку</a>
            </Button>
          </div>

          <button
            className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMobileMenuOpen ? 'max-h-80 pb-6' : 'max-h-0'
          }`}
        >
          <nav className="flex flex-col gap-2 pt-4 border-t border-border">
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
              className="px-4 py-3 flex items-center gap-2 font-bold text-foreground"
            >
              <Phone className="w-5 h-5" />
              +7 900 288-52-55
            </a>
            <Button className="mt-2 rounded-full hero-gradient" asChild>
              <a href="#contacts">Заказать уборку</a>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
