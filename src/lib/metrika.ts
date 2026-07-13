declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

const METRIKA_ID = 107216997;

export type MetrikaGoal =
  | "phone_click"
  | "messenger_click"
  | "whatsapp_click"
  | "telegram_click"
  | "max_click"
  | "email_click"
  | "form_start"
  | "form_submit"
  | "form_error"
  | "pricing_cta_click"
  | "contact_scroll"
  | "service_click";

export const reachGoal = (goal: MetrikaGoal, params?: Record<string, unknown>) => {
  if (typeof window !== "undefined" && typeof window.ym === "function") {
    window.ym(METRIKA_ID, "reachGoal", goal, {
      page: window.location.pathname,
      ...params,
    });
  }
};

const trackedForms = new WeakSet<HTMLFormElement>();

const linkDetails = (link: HTMLAnchorElement) => ({
  placement: link.getAttribute('data-track-placement') || 'link',
  link_text: link.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || undefined,
});

export const installAutomaticGoalTracking = () => {
  if (typeof document === 'undefined') return () => undefined;
  if (/^\/calc\/?$/.test(window.location.pathname)) return () => undefined;

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest('a');
    if (!(link instanceof HTMLAnchorElement)) return;

    const href = link.href;
    const details = linkDetails(link);

    if (href.includes('wa.me/')) reachGoal('whatsapp_click', details);
    else if (href.includes('t.me/')) reachGoal('telegram_click', details);
    else if (href.includes('max.ru/')) reachGoal('max_click', details);
    else if (href.startsWith('mailto:')) reachGoal('email_click', details);

    const servicePath = link.getAttribute('href') || '';
    if (/^\/(uborka-|himchistka-|moyka-)/.test(servicePath)) {
      reachGoal('service_click', { ...details, destination: servicePath });
    }
  };

  const onFocus = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const form = target.closest('form');
    if (!(form instanceof HTMLFormElement) || trackedForms.has(form)) return;

    trackedForms.add(form);
    reachGoal('form_start', {
      form: form.getAttribute('data-track-form') || form.getAttribute('id') || 'lead_form',
    });
  };

  document.addEventListener('click', onClick, true);
  document.addEventListener('focusin', onFocus, true);

  return () => {
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('focusin', onFocus, true);
  };
};
