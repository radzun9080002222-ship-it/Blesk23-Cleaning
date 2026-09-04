import type { CleaningType } from '@/lib/pricing';

export const CLEANING_CALENDAR_ID = 'cleanlifesochi@gmail.com';
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const CALENDAR_CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '';
const EVENTS_URL = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CLEANING_CALENDAR_ID)}/events`;

const labels: Record<CleaningType, string> = {
  wet: 'Влажная', general: 'Генеральная', repair: 'После ремонта', all_inclusive: 'Всё включено',
};

export type CalendarBooking = {
  type: CleaningType;
  area: number;
  newClient: boolean;
  privateHouse: boolean;
  date: string;
  time: string;
  name: string;
  phone: string;
  address: string;
  estimate: string;
  declaredSource: string;
  hasServices: boolean;
};

export type CleaningCalendarEvent = {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  extendedProperties: { private: { source: string; newClient: string } };
  reminders: { useDefault: false };
};

export const calendarTitle = (booking: Pick<CalendarBooking, 'type' | 'area' | 'newClient'>) =>
  `${labels[booking.type]}${booking.area > 0 ? ` ${booking.area} кв.м.` : ''}${booking.newClient ? ' - новый клиент' : ''}`;

export function calendarValidation(booking: CalendarBooking): string | null {
  if (!booking.hasServices) return 'Выберите услуги для расчёта.';
  const phone = booking.phone.replace(/\D/g, '');
  if (!/^(?:[78])?\d{10}$/.test(phone)) return 'Заполните телефон клиента: 10 цифр или 11 с 7/8.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.time)) {
    return 'Укажите день и время уборки.';
  }
  const day = new Date(`${booking.date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== booking.date) {
    return 'Проверьте дату уборки.';
  }
  return null;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

export function buildCalendarEvent(booking: CalendarBooking, id: string): CleaningCalendarEvent {
  const error = calendarValidation(booking);
  if (error) throw new Error(error);
  const start = `${booking.date}T${booking.time}:00+03:00`;
  return {
    id,
    summary: calendarTitle(booking),
    location: booking.address,
    description: escapeHtml([
      booking.estimate,
      booking.newClient ? 'Новый клиент: да' : '',
      booking.privateHouse ? 'Объект: частный дом' : '',
      booking.declaredSource ? `Источник со слов клиента: ${booking.declaredSource}` : '',
      'Запись создана внутренним калькулятором blesk23.ru. Время в календаре: 1 час.',
    ].filter(Boolean).join('\n\n')),
    start: { dateTime: start, timeZone: 'Europe/Moscow' },
    end: { dateTime: new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'Europe/Moscow' },
    extendedProperties: { private: { source: 'blesk23_internal_calc', newClient: String(booking.newClient) } },
    reminders: { useDefault: false },
  };
}

type TokenResponse = { access_token?: string; expires_in?: number; scope?: string; error?: string };
type GoogleIdentity = {
  accounts: { oauth2: {
    initTokenClient: (options: {
      client_id: string; scope: string; hint: string; include_granted_scopes: boolean;
      callback: (response: TokenResponse) => void;
      error_callback: (error: { type: string }) => void;
    }) => { requestAccessToken: () => void };
  } };
};
const identity = () => (window as Window & { google?: GoogleIdentity }).google;
let identityLoading: Promise<void> | undefined;
let token: { value: string; expires: number } | undefined;

export function loadCalendarIdentity(): Promise<void> {
  if (identity()?.accounts?.oauth2) return Promise.resolve();
  if (identityLoading) return identityLoading;
  identityLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    const timer = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error('Не удалось загрузить подключение Google. Проверьте интернет и блокировщик.'));
    };
    script.onload = () => {
      window.clearTimeout(timer);
      if (identity()?.accounts?.oauth2) resolve();
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error) => { identityLoading = undefined; throw error; });
  return identityLoading;
}

// Invoke directly from a click handler, before any await, so the OAuth popup is not blocked.
export function requestCalendarAccess(): Promise<string> {
  if (token && token.expires > Date.now()) return Promise.resolve(token.value);
  return new Promise((resolve, reject) => {
    if (!CALENDAR_CLIENT_ID) return reject(new Error('Подключение календаря ещё не настроено: нужен Google OAuth Client ID.'));
    const google = identity();
    if (!google) return reject(new Error('Подключение Google ещё загружается. Повторите нажатие.'));
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CALENDAR_CLIENT_ID,
      scope: CALENDAR_SCOPE,
      hint: CLEANING_CALENDAR_ID,
      include_granted_scopes: false,
      callback: (response) => {
        if (response.error || !response.access_token || !response.scope?.split(' ').includes(CALENDAR_SCOPE)) {
          reject(new Error('Google не предоставил доступ к событиям календаря. Повторите вход и разрешите доступ.'));
          return;
        }
        token = { value: response.access_token, expires: Date.now() + Math.max(0, Number(response.expires_in || 0) - 60) * 1000 };
        resolve(token.value);
      },
      error_callback: () => reject(new Error('Окно Google закрыто или заблокировано. Разрешите всплывающие окна и повторите.')),
    });
    client.requestAccessToken();
  });
}

export type CalendarReceipt = { id: string; htmlLink?: string; summary: string; status: string };

function calendarApiError(status: number): Error {
  if (status === 401) {
    token = undefined;
    return new Error('Срок доступа Google истёк. Нажмите отправку ещё раз для входа.');
  }
  if (status === 403 || status === 404) {
    token = undefined;
    return new Error(`Нет доступа к календарю ${CLEANING_CALENDAR_ID} или не включён Calendar API. Войдите в рабочий аккаунт и проверьте права.`);
  }
  return new Error(`Google Календарь временно недоступен (HTTP ${status}). Повторите отправку — номер записи сохранён.`);
}

export async function insertCalendarEvent(event: CleaningCalendarEvent, accessToken: string): Promise<CalendarReceipt> {
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  try {
    let response = await fetch(EVENTS_URL, {
      method: 'POST', headers, body: JSON.stringify(event), signal: controller.signal,
    });
    // Same event ID on retry: a lost response must not create a second booking.
    if (response.status === 409) {
      response = await fetch(`${EVENTS_URL}/${encodeURIComponent(event.id)}`, {
        headers, signal: controller.signal,
      });
    }
    if (!response.ok) throw calendarApiError(response.status);
    const result = await response.json() as CalendarReceipt;
    if (result.id !== event.id || result.status !== 'confirmed') {
      throw new Error('Google не подтвердил активную запись. Проверьте календарь перед повторной отправкой.');
    }
    return result;
  } catch (error) {
    if (controller.signal.aborted || error instanceof TypeError) {
      throw new Error('Ответ Google не получен. Повторите отправку в этой вкладке: сохранён тот же номер записи, дубль не создастся.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function safeCalendarLink(link: string | undefined): string | undefined {
  if (!link) return undefined;
  try {
    const url = new URL(link);
    return url.protocol === 'https:' && ['calendar.google.com', 'www.google.com'].includes(url.hostname) ? url.href : undefined;
  } catch { return undefined; }
}
