import { Phone, MessageCircle } from 'lucide-react';
import { reachGoal } from '@/lib/metrika';

const FloatingContact = () => (
  <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
    <a
      href="https://wa.me/79002885255?text=Здравствуйте! Хочу заказать уборку"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Написать в WhatsApp"
      onClick={() => reachGoal('whatsapp_click')}
      className="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 hover:scale-105 transition-transform"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
    <a
      href="tel:+79002885255"
      aria-label="Позвонить"
      onClick={() => reachGoal('phone_click')}
      className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/20 hover:scale-105 transition-transform md:hidden"
    >
      <Phone className="w-6 h-6" />
    </a>
  </div>
);

export default FloatingContact;
