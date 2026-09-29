import { Check, MessageCircle, Phone, Send } from 'lucide-react';
import { reachGoal } from '@/lib/metrika';
import maxIcon from '@/assets/max-icon.webp';

const PHONE = '+7 900 288-52-55';
const PHONE_HREF = 'tel:+79002885255';
const WA_URL = 'https://wa.me/79002885255';
const TG_URL = 'https://t.me/+79002885255';
const MAX_URL =
  'https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk';

type Props = {
  sectionId?: string;
  title?: string;
  subtitle?: string;
};

const perks = ['Расчёт за 5 минут по телефону', 'Цену фиксируем до выезда', 'Без доплат на месте'];

const CallForPrice = ({
  sectionId = 'calc',
  title = 'Узнайте точную стоимость по телефону',
  subtitle = 'Позвоните или напишите — менеджер задаст пару вопросов, рассчитает цену и подберёт удобное время.',
}: Props) => (
  <section id={sectionId} className="relative overflow-hidden bg-[#003F3B] py-16 text-white md:py-20">
    <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top_right,#21a99a_0,transparent_45%)]" />
    <div className="container relative mx-auto px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-bold leading-tight md:text-4xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">{subtitle}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-white/85">
          {perks.map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
              <Check className="h-4 w-4 text-[#62D5C4]" /> {item}
            </span>
          ))}
        </div>

        <a
          href={PHONE_HREF}
          onClick={() => reachGoal('phone_click', { placement: 'call_for_price' })}
          className="mt-8 inline-flex items-center justify-center gap-3 rounded-full bg-[#41BFAE] px-8 py-4 text-xl font-bold text-[#003F3B] shadow-xl transition hover:bg-[#41BFAE]/90 md:text-2xl"
        >
          <Phone className="h-6 w-6" />
          {PHONE}
        </a>
        <p className="mt-3 text-sm text-white/60">Ежедневно с 8:00 до 23:00</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => reachGoal('whatsapp_click', { placement: 'call_for_price' })}
            className="inline-flex items-center rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white transition hover:bg-[#1ebe5b]"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            WhatsApp
          </a>
          <a
            href={TG_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => reachGoal('telegram_click', { placement: 'call_for_price' })}
            className="inline-flex items-center rounded-full bg-[#229ED9] px-6 py-3 font-semibold text-white transition hover:bg-[#1d8dc2]"
          >
            <Send className="mr-2 h-5 w-5" />
            Telegram
          </a>
          <a
            href={MAX_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => reachGoal('max_click', { placement: 'call_for_price' })}
            className="inline-flex items-center rounded-full bg-white px-6 py-3 font-semibold text-[#003F3B] transition hover:bg-white/90"
          >
            <img src={maxIcon} alt="Max" className="mr-2 h-5 w-5 rounded" />
            Max
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default CallForPrice;
