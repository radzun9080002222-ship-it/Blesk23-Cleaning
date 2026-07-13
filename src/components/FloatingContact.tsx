import { MessageCircle, Phone } from 'lucide-react';
import { reachGoal } from '@/lib/metrika';
import { useLocation } from 'react-router-dom';

const PHONE_HREF = 'tel:+79002885255';
const MAX_HREF =
  'https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk';

const HIDDEN_ROUTES = [
  '/calc',
  '/privacy',
  '/consent',
  '/requisites',
];

const FloatingContact = () => {
  const { pathname } = useLocation();
  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto flex h-[60px] w-full max-w-[286px] items-center rounded-full border border-border/80 bg-white/95 p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)] backdrop-blur-md">
        <a
          href={MAX_HREF}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Написать в MAX"
          className="flex h-12 w-[108px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#168B7A] px-4 text-[15px] font-bold text-white transition-all hover:bg-[#117567] hover:shadow-md active:scale-[0.98]"
        >
          <MessageCircle className="h-4 w-4 fill-current" aria-hidden="true" />
          <span>MAX</span>
        </a>
        <a
          href={PHONE_HREF}
          aria-label="Позвонить"
          onClick={() => reachGoal('phone_click')}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
        >
          <Phone className="h-4 w-4 fill-current" aria-hidden="true" />
          <span>Позвонить</span>
        </a>
      </div>
    </div>
  );
};

export default FloatingContact;
