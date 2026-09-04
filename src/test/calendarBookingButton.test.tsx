import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarBookingButton } from '@/components/calculator/CalendarBookingButton';
import * as calendar from '@/lib/googleCalendar';

vi.mock('@/lib/googleCalendar', async (importOriginal) => ({
  ...await importOriginal<typeof calendar>(),
  CALENDAR_CLIENT_ID: 'test-client',
  loadCalendarIdentity: vi.fn().mockResolvedValue(undefined),
  requestCalendarAccess: vi.fn().mockResolvedValue('test-access'),
  insertCalendarEvent: vi.fn(),
}));

const booking: calendar.CalendarBooking = {
  type: 'wet', area: 30, newClient: true, privateHouse: false, date: '2026-09-10', time: '10:00',
  name: 'Тест', phone: '89000000000', address: '', estimate: 'Тестовая смета', declaredSource: '', hasServices: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(calendar.insertCalendarEvent).mockImplementation(async (event) => ({ id: event.id, status: 'confirmed', summary: event.summary }));
});
afterEach(cleanup);

describe('CalendarBookingButton', () => {
  it('waits for a valid booking, then shows success only after API completion', async () => {
    const view = render(<CalendarBookingButton booking={{ ...booking, date: '' }} />);
    expect(screen.getByRole('button', { name: 'Отправить в Google Календарь' })).toBeDisabled();
    view.rerender(<CalendarBookingButton booking={booking} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Отправить в Google Календарь' })).toBeEnabled());
    let complete!: (receipt: calendar.CalendarReceipt) => void;
    vi.mocked(calendar.insertCalendarEvent).mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Отправить в Google Календарь' }));
    await waitFor(() => expect(calendar.insertCalendarEvent).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Запись создана в календаре')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отправляем…' })).toBeDisabled();
    const event = vi.mocked(calendar.insertCalendarEvent).mock.calls[0][0];
    await act(async () => complete({ id: event.id, status: 'confirmed', summary: event.summary }));
    expect(screen.getByRole('button', { name: 'Запись создана в календаре' })).toBeDisabled();
  });

  it('retries unchanged ID and contents after network failure, even if fields were edited', async () => {
    vi.mocked(calendar.insertCalendarEvent).mockRejectedValueOnce(new Error('Сеть недоступна'));
    const view = render(<CalendarBookingButton booking={booking} />);
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('alert');
    const first = vi.mocked(calendar.insertCalendarEvent).mock.calls[0][0];
    view.rerender(<CalendarBookingButton booking={{ ...booking, newClient: false, area: 60 }} />);
    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('button', { name: 'Запись создана в календаре' });
    expect(vi.mocked(calendar.insertCalendarEvent).mock.calls[1][0]).toEqual(first);
  });

  it('does not post anything when Google access is declined and permits correcting fields', async () => {
    vi.mocked(calendar.requestCalendarAccess).mockRejectedValueOnce(new Error('Нет доступа'));
    const view = render(<CalendarBookingButton booking={booking} />);
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('alert');
    expect(calendar.insertCalendarEvent).not.toHaveBeenCalled();
    view.rerender(<CalendarBookingButton booking={{ ...booking, newClient: false }} />);
    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('button', { name: 'Запись создана в календаре' });
    expect(vi.mocked(calendar.insertCalendarEvent).mock.calls[0][0].summary).toBe('Влажная 30 кв.м.');
  });
});
