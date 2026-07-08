import { useRef, useState, useCallback } from 'react';

interface Props {
  before: string;
  after: string;
  caption?: string;
}

const BeforeAfterSlider = ({ before, after, caption }: Props) => {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <figure className="space-y-3">
      <div
        ref={ref}
        className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl select-none touch-none border border-border bg-muted"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={after}
          alt={caption ? `${caption} — после` : 'после'}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        <img
          src={before}
          alt={caption ? `${caption} — до` : 'до'}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          draggable={false}
        />


        {/* Labels */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 text-white text-xs font-medium tracking-wide">
          ДО
        </span>
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium tracking-wide">
          ПОСЛЕ
        </span>

        {/* Divider + handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] pointer-events-none"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-border flex items-center justify-center text-primary"
          style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }}
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="-ml-1">
            <polyline points="9 6 15 12 9 18" />
          </svg>

        </div>
      </div>
      {caption && (
        <figcaption className="text-sm text-muted-foreground text-center">{caption}</figcaption>
      )}
    </figure>
  );
};

export default BeforeAfterSlider;
