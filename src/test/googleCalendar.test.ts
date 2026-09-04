import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCalendarEvent, calendarTitle, calendarValidation, CLEANING_CALENDAR_ID, insertCalendarEvent, safeCalendarLink, type CalendarBooking } from '@/lib/googleCalendar';

const booking: CalendarBooking = {
  type: 'wet', area: 30, newClient: true, privateHouse: false,
  date: '2026-09-10', time: '09:30', name: 'Тест', phone: '+7 (900) 000-00-00',
  address: 'Тестовый адрес', estimate: 'Имя: Тест\nТелефон: +7 (900) 000-00-00\nВлажная 30 м²\nИТОГО: 4 000 ₽',
  declaredSource: '', hasServices: true,
};
afterEach(() => vi.unstubAllGlobals());

describe('manager calendar event', () => {
  it('marks a new client only when selected, for all cleaning types', () => {
    expect(calendarTitle(booking)).toBe('Влажная 30 кв.м. - новый клиент');
    expect(calendarTitle({ ...booking, newClient: false })).toBe('Влажная 30 кв.м.');
    expect(calendarTitle({ ...booking, type: 'repair' })).toBe('После ремонта 30 кв.м. - новый клиент');
    expect(calendarTitle({ ...booking, type: 'general' })).toBe('Генеральная 30 кв.м. - новый клиент');
    expect(calendarTitle({ ...booking, type: 'all_inclusive' })).toBe('Всё включено 30 кв.м. - новый клиент');
  });

  it('creates exactly one hour in Moscow time, regardless of browser time zone', () => {
    const event = buildCalendarEvent(booking, 'abc123');
    expect(event.start).toEqual({ dateTime: '2026-09-10T09:30:00+03:00', timeZone: 'Europe/Moscow' });
    expect(event.end.dateTime).toBe('2026-09-10T07:30:00.000Z');
    expect(Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime)).toBe(3600000);
    const midnight = buildCalendarEvent({ ...booking, date: '2026-12-31', time: '23:30' }, 'abc123');
    expect(midnight.end.dateTime).toBe('2026-12-31T21:30:00.000Z');
  });

  it.each(['', '2026-02-30', '2026-13-10'])('rejects missing/impossible date %s', (date) => {
    expect(() => buildCalendarEvent({ ...booking, date }, 'abc123')).toThrow();
  });
  it.each(['', '25:00', '09:60'])('rejects missing/impossible time %s', (time) => {
    expect(() => buildCalendarEvent({ ...booking, time }, 'abc123')).toThrow();
  });
  it.each(['+7 (900) 000-00-00', '8 (900) 000-00-00', '9000000000'])('accepts RF phone %s', (phone) => {
    expect(calendarValidation({ ...booking, phone })).toBeNull();
  });
  it('requires a service and a valid phone', () => {
    expect(calendarValidation({ ...booking, hasServices: false })).toBeTruthy();
    expect(calendarValidation({ ...booking, phone: '123' })).toBeTruthy();
  });
  it('includes the estimate, object and source without adding guests or reminders', () => {
    const event = buildCalendarEvent({ ...booking, privateHouse: true, declaredSource: 'Рекомендация' }, 'abc123');
    expect(event.description).toContain(booking.estimate);
    expect(event.description).toContain('Объект: частный дом');
    expect(event.description).toContain('Источник со слов клиента: Рекомендация');
    expect(event.extendedProperties.private.newClient).toBe('true');
    expect(event.reminders.useDefault).toBe(false);
    expect(event).not.toHaveProperty('attendees');
    expect(event.description).not.toContain('Маржа');
    expect(buildCalendarEvent({ ...booking, estimate: '<img src=x>' }, 'abc123').description).toContain('&lt;img src=x&gt;');
  });
});

describe('Calendar API confirmation', () => {
  const event = buildCalendarEvent(booking, 'abc123');
  const receipt = { id: 'abc123', summary: event.summary, status: 'confirmed' };
  it('only writes to the specified working calendar, never primary', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(receipt), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await expect(insertCalendarEvent(event, 'test-token')).resolves.toEqual(receipt);
    expect(fetch.mock.calls[0][0]).toContain(encodeURIComponent(CLEANING_CALENDAR_ID));
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(event) });
  });
  it('reads back a duplicate ID after an uncertain first attempt instead of creating another event', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(receipt), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await expect(insertCalendarEvent(event, 'test-token')).resolves.toEqual(receipt);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toMatch(/\/events\/abc123$/);
    expect(fetch.mock.calls[1][1]).not.toHaveProperty('body');
  });
  it.each([401, 403, 404, 429, 500])('does not report success on HTTP %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
    await expect(insertCalendarEvent(event, 'test-token')).rejects.toThrow();
  });
  it('rejects cancelled events and unrelated IDs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...receipt, status: 'cancelled' }))));
    await expect(insertCalendarEvent(event, 'test-token')).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...receipt, id: 'other' }))));
    await expect(insertCalendarEvent(event, 'test-token')).rejects.toThrow();
  });
  it('only displays Google https links', () => {
    expect(safeCalendarLink('https://calendar.google.com/calendar/event?eid=123')).toBeTruthy();
    expect(safeCalendarLink('javascript:alert(1)')).toBeUndefined();
    expect(safeCalendarLink('https://fake.example')).toBeUndefined();
  });
});
