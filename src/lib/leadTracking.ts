const TRACKING_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'yclid',
  'utm_referer',
  'utm_ya_campaign',
  'utm_candidate',
  'ybaip',
  'gclid',
  'fbclid',
  'roistat_visit',
] as const;

const STORAGE_KEY = 'blesk23_lead_attribution';

type LeadAttribution = Partial<Record<(typeof TRACKING_KEYS)[number], string>> & {
  landing_page?: string;
  referrer?: string;
  metrika_client_id?: string;
  captured_at?: string;
};

const readMetrikaClientId = () => {
  const match = document.cookie.match(/(?:^|;\s*)_ym_uid=([^;]+)/);
  return match?.[1];
};

const readStoredAttribution = (): LeadAttribution => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}') as LeadAttribution;
  } catch {
    return {};
  }
};

const collectAttribution = (): LeadAttribution => {
  if (typeof window === 'undefined') return {};

  const stored = readStoredAttribution();
  const search = new URLSearchParams(window.location.search);
  const current: LeadAttribution = { ...stored };

  TRACKING_KEYS.forEach((key) => {
    const value = search.get(key);
    if (value) current[key] = value;
  });

  current.landing_page ||= `${window.location.pathname}${window.location.search}`;
  current.referrer ||= document.referrer || undefined;
  current.metrika_client_id ||= readMetrikaClientId();
  current.captured_at ||= new Date().toISOString();

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Заявка должна отправляться даже при запрещённом sessionStorage.
  }

  return current;
};

export const captureLeadAttribution = () => {
  collectAttribution();
};

export const appendLeadTracking = (message: string) => {
  const attribution = collectAttribution();
  const page = `${window.location.pathname}${window.location.search}`;
  const details = Object.entries(attribution)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}: ${value}`);

  details.push(`current_page: ${page}`);

  if (details.length === 0) return message;
  return `${message.trim()}\n\nАтрибуция:\n${details.join('\n')}`.trim();
};
