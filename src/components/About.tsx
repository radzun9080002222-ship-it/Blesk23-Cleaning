import { CheckCircle2, Users, Award, Wrench, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import brigadierImage from '@/assets/brigadier.webp';
import windowImage from '@/assets/window-cleaning.webp';

const About = () => {
  const advantages = [
    {
      icon: Users,
      title: 'Опытная команда',
      description: 'Обученные специалисты с опытом',
    },
    {
      icon: Wrench,
      title: 'Проф. средства',
      description: 'Профессиональная химия для уборки',
    },
    {
      icon: Award,
      title: 'Гарантия качества',
      description: 'Бесплатная переделка в течение 24ч',
    },
    {
      icon: Clock,
      title: 'Работаем быстро',
      description: 'Выезд в день обращения',
    },
  ];

  const checklist = [
    'Фиксированные цены без скрытых доплат',
    'Современное профессиональное оборудование',
    'Страхование ответственности',
    'Контроль качества после каждой уборки',
  ];

  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 -translate-y-1/2 -left-64 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-1/4 -right-32 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Visual with Photos */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={brigadierImage} 
                alt="Бригадир Империя Блеска" 
                loading="lazy"
                decoding="async"
                className="w-full h-[400px] object-cover"
              />
            </div>
            
            <div className="absolute -bottom-8 -right-8 w-48 h-64 rounded-2xl overflow-hidden shadow-xl border-4 border-background hidden md:block">
              <img 
                src={windowImage} 
                alt="Мытье окон" 
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute -top-4 -left-4 px-6 py-4 bg-card rounded-2xl shadow-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="font-heading font-bold">№1 в Сочи</p>
                  <p className="text-sm text-muted-foreground">по версии клиентов</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div className="space-y-8">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                О компании
              </span>
              <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
                Мы делаем
                <span className="text-gradient"> чистоту </span>
                доступной
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                «Империя Блеска» — это команда профессионалов в Сочи, которая заботится о чистоте 
                вашего пространства. Мы обслуживаем Сочи, Адлер и Красную Поляну, используя 
                только проверенные методы и профессиональные средства для уборки.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {advantages.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>

            <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/25 hero-gradient" asChild>
              <a href="#contacts">Связаться с нами</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
