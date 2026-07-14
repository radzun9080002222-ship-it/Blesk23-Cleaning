import { queueGoogleLead } from '@/lib/googleForms';

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
const STORAGE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type LeadAttribution = Partial<Record<(typeof TRACKING_KEYS)[number], string>> & {
  landing_page?: string;
  referrer?: string;
  metrika_client_id?: string;
  captured_at?: string;
};

type StoredAttribution = {
  attribution: LeadAttribution;
  expires_at: number;
};

export type TrackedClickKind =
  | 'phone_click'
  | 'whatsapp_click'
  | 'telegram_click'
  | 'max_click';

const readMetrikaClientId = () => {
  const match = document.cookie.match(/(?:^|;\s*)_ym_uid=([^;]+)/);
  return match?.[1];
};

const parseStoredAttribution = (raw: string | null): LeadAttribution => {
  try {
    const parsed = JSON.parse(raw || '{}') as LeadAttribution | StoredAttribution;
    if ('attribution' in parsed) {
      if (!parsed.expires_at || parsed.expires_at < Date.now()) return {};
      return parsed.attribution || {};
    }
    return parsed;
  } catch {
    return {};
  }
};

const readStoredAttribution = (): LeadAttribution => {
  const session = parseStoredAttribution(sessionStorage.getItem(STORAGE_KEY));
  if (Object.keys(session).length > 0) return session;
  return parseStoredAttribution(localStorage.getItem(STORAGE_KEY));
};

const storeAttribution = (attribution: LeadAttribution) => {
  const stored: StoredAttribution = {
    attribution,
    expires_at: Date.now() + STORAGE_TTL_MS,
  };
  const serialized = JSON.stringify(stored);

  sessionStorage.setItem(STORAGE_KEY, serialized);
  localStorage.setItem(STORAGE_KEY, serialized);
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
    storeAttribution(current);
  } catch {
    // Заявка должна отправляться даже при запрещённом browser storage.
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

export const queueClickAttribution = (
  eventKind: TrackedClickKind,
  placement?: string
) => {
  const messengerChannel = eventKind.endsWith('_click')
    ? eventKind.replace('_click', '')
    : '';
  const message = appendLeadTracking(
    [
      `Событие сайта: ${eventKind}`,
      placement && `Размещение: ${placement}`,
    ]
      .filter(Boolean)
      .join('\n')
  );

  const eventMessage = [
    message,
    `event_kind: ${eventKind}`,
    eventKind === 'phone_click' ? '' : `messenger_channel: ${messengerChannel}`,
  ]
    .filter(Boolean)
    .join('\n');

  return queueGoogleLead({
    name: 'Системное событие',
    phone: '+79002885255',
    message: eventMessage,
  });
};

export const queuePhoneClickAttribution = (placement?: string) =>
  queueClickAttribution('phone_click', placement);

export const queueMessengerClickAttribution = (
  channel: 'whatsapp' | 'telegram' | 'max',
  placement?: string
) => queueClickAttribution(`${channel}_click`, placement);
