import { Phone } from 'lucide-react';
import maxIcon from '@/assets/max-icon.webp';
import { reachGoal } from '@/lib/metrika';

const PHONE_HREF = 'tel:+79002885255';
const MAX_HREF =
  'https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk';

const FloatingContact = () => (
  <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
    <div className="flex w-full max-w-[360px] items-center gap-2 rounded-full border border-white/10 bg-black/85 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-md sm:w-auto sm:max-w-none">
      <a
        href={MAX_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Написать в MAX"
        onClick={() => reachGoal('messenger_click')}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#16b8ff] via-[#2d8cff] to-[#6b45ff] px-6 text-sm font-bold text-white shadow-lg shadow-[#2d8cff]/25 transition-transform hover:scale-[1.02] sm:w-32 sm:flex-none"
      >
        <img src={maxIcon} alt="" className="h-5 w-5" aria-hidden="true" />
        <span>MAX</span>
      </a>
      <a
        href={PHONE_HREF}
        aria-label="Позвонить"
        onClick={() => reachGoal('phone_click')}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:w-36 sm:flex-none"
      >
        <Phone className="h-4 w-4" />
        <span>Позвонить</span>
      </a>
    </div>
  </div>
);

export default FloatingContact;
