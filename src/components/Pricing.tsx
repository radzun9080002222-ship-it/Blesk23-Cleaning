import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reachGoal } from '@/lib/metrika';

interface PricingProps {
  onSelectPlan?: (planName: string) => void;
}

const Pricing = ({ onSelectPlan }: PricingProps) => {
  const plans = [
    {
      name: 'Влажная уборка',
      subtitle: 'Поддерживающая уборка',
      price: 'от 110',
      unit: '₽ / м²',
      features: [
        'Пылесос во всех комнатах',
        'Влажная уборка полов',
        'Мытьё дверей и плинтусов',
        'Удаление пыли с доступных поверхностей',
        'Уборка кухни: фасады, фартук, техника снаружи',
        'Очистка зеркал и стеклянных поверхностей',
        'Уборка санузла: сантехника, раковина, унитаз, душевая/ванна',
      ],
      highlighted: false,
    },
    {
      name: 'Генеральная',
      subtitle: 'Глубокая уборка',
      price: 'от 250',
      unit: '₽ / м²',
      features: [
        'Всё из тарифа «Влажная уборка»',
        'Обеспыливание стен и потолков',
        'Уборка труднодоступных мест, включая зоны на высоте',
        'Глубокая очистка сантехники от ржавчины и известкового налёта',
        'Очистка осветительных приборов и люстр',
        'Протирка мебели и предметов интерьера',
        'Локальное удаление сложных загрязнений парогенератором',
      ],
      highlighted: true,
    },
    {
      name: 'Всё включено',
      subtitle: 'Максимальный результат',
      price: 'от 450',
      unit: '₽ / м²',
      features: [
        'Всё из тарифа «Генеральная»',
        'Мытьё всех окон, рам и фурнитуры',
        'Уборка внутри шкафов и систем хранения',
        'Глубокая чистка всей кухонной техники внутри',
        'Ароматизация помещений',
        'Максимальная детализация труднодоступных мест',
      ],
      highlighted: false,
    },
  ];

  const handleSelect = (planName: string) => {
    reachGoal('form_submit');
    if (onSelectPlan) {
      onSelectPlan(planName);
    }
    const el = document.getElementById('contacts');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4 tracking-wide uppercase">
            Тарифы
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Прозрачные цены
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            Никаких скрытых платежей. Стоимость фиксируется до начала работ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isPopular = plan.highlighted;

            return (
              <div
                key={plan.name}
                className={`
                  relative flex flex-col rounded-2xl p-6 lg:p-8
                  transition-all duration-300 ease-out
                  hover:scale-[1.02]
                  ${isPopular
                    ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 md:-mt-4 md:mb-4 z-10'
                    : 'bg-white border border-border/60 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.1)]'
                  }
                `}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-primary text-xs font-bold rounded-full shadow-md uppercase tracking-wider">
                    Популярный выбор
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`font-heading text-2xl font-bold mb-1 ${isPopular ? 'text-white' : 'text-foreground'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${isPopular ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {plan.subtitle}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-heading text-4xl font-bold ${isPopular ? 'text-white' : 'text-foreground'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-lg font-medium ${isPopular ? 'text-white/90' : 'text-muted-foreground'}`}>
                      {plan.unit}
                    </span>
                  </div>
                  <p className={`text-xs mt-1.5 ${isPopular ? 'text-white/70' : 'text-muted-foreground/80'}`}>
                    Стоимость зависит от степени загрязнения
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 shrink-0 mt-0.5 ${isPopular ? 'text-white/90' : 'text-primary'}`} />
                      <span className={`text-sm leading-relaxed ${isPopular ? 'text-white/90' : 'text-muted-foreground'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isPopular ? 'secondary' : 'default'}
                  className={`
                    w-full rounded-full font-semibold
                    ${isPopular
                      ? 'bg-white text-primary hover:bg-white/90 shadow-lg'
                      : 'shadow-sm'
                    }
                  `}
                  onClick={() => handleSelect(`Тариф «${plan.name}»`)}                >
                  Рассчитать стоимость
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm md:text-base">
            Нужна индивидуальная оценка?{' '}
            <a
              href="#contacts"
              className="text-primary hover:underline font-medium"
              onClick={() => reachGoal('form_submit')}
            >
              Свяжитесь с нами
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
