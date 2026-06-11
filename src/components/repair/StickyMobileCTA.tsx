import { Phone, MessageCircle } from 'lucide-react';
import { reachGoal } from '@/lib/metrika';

const StickyMobileCTA = () => (
  <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-[#DDEBE8] shadow-[0_-4px_20px_-8px_rgba(0,63,59,0.15)]">
    <div className="grid grid-cols-2 gap-2">
      <a
        href="https://wa.me/79002885255"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => reachGoal('messenger_click')}
        className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[#25D366] text-white font-semibold"
      >
        <MessageCircle className="w-5 h-5" />
        WhatsApp
      </a>
      <a
        href="tel:+79002885255"
        onClick={() => reachGoal('phone_click')}
        className="flex items-center justify-center gap-2 h-12 rounded-xl hero-gradient text-white font-semibold"
      >
        <Phone className="w-5 h-5" />
        Позвонить
      </a>
    </div>
  </div>
);

export default StickyMobileCTA;
