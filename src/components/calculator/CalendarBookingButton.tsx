import { useEffect, useRef, useState } from 'react';
import { Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildCalendarEvent, calendarTitle, calendarValidation, CALENDAR_CLIENT_ID, CLEANING_CALENDAR_ID,
  insertCalendarEvent, loadCalendarIdentity, requestCalendarAccess, safeCalendarLink,
  type CalendarBooking, type CalendarReceipt, type CleaningCalendarEvent,
} from '@/lib/googleCalendar';

export function CalendarBookingButton({ booking, onSendingChange }: { booking: CalendarBooking; onSendingChange?: (sending: boolean) => void }) {
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<CalendarReceipt>();
  const pending = useRef<CleaningCalendarEvent>();
  const busy = useRef(false);
  const validation = calendarValidation(booking);

  useEffect(() => {
    if (!CALENDAR_CLIENT_ID) return;
    let mounted = true;
    loadCalendarIdentity().then(() => { if (mounted) setReady(true); })
      .catch((failure: Error) => { if (mounted) setError(failure.message); });
    return () => { mounted = false; };
  }, []);

  const submit = async () => {
    if (busy.current || receipt) return;
    busy.current = true;
    setSending(true);
    onSendingChange?.(true);
    setError('');
    try {
      // Keep both ID and contents unchanged across uncertain network failures.
      const event = pending.current ?? buildCalendarEvent(booking, crypto.randomUUID().replace(/-/g, ''));
      const access = await requestCalendarAccess();
      pending.current = event;
      setReceipt(await insertCalendarEvent(pending.current, access));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось подтвердить запись. Повторите отправку.');
    } finally {
      busy.current = false;
      setSending(false);
      onSendingChange?.(false);
    }
  };

  const eventLink = safeCalendarLink(receipt?.htmlLink);
  return <>
    <p className="text-xs text-muted-foreground break-words">
      Календарь: {CLEANING_CALENDAR_ID}<br />
      {pending.current?.summary || calendarTitle(booking)} · 1 час · время Москвы
    </p>
    <Button onClick={submit} className="w-full rounded-xl bg-[#0C7C8C] hover:bg-[#0a6b79] text-white"
      disabled={!ready || sending || !!receipt || (!pending.current && !!validation)}>
      {receipt ? <Check className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
      {sending ? 'Отправляем…' : receipt ? 'Запись создана в календаре' : 'Отправить в Google Календарь'}
    </Button>
    {!CALENDAR_CLIENT_ID && <p role="status" className="text-xs text-amber-700">Google Календарь ещё не подключён. Требуется настройка доступа Google.</p>}
    {validation && !pending.current && <p className="text-xs text-muted-foreground">{validation}</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {error && !ready && !!CALENDAR_CLIENT_ID && <Button variant="outline" onClick={() => {
      setError('');
      void loadCalendarIdentity().then(() => setReady(true)).catch((failure: Error) => setError(failure.message));
    }}>Повторить подключение Google</Button>}
    {pending.current && !receipt && !sending && <p className="text-xs text-muted-foreground">
      Повторная отправка использует данные первой попытки, чтобы не создать дубль. Перед новым заказом проверьте календарь и нажмите «Сбросить всё».
    </p>}
    {receipt && <p role="status" className="text-xs text-emerald-700">
      {eventLink && <a href={eventLink} target="_blank" rel="noopener noreferrer" className="underline">Открыть запись в календаре</a>}
      <br />Изменения расчёта автоматически не переносятся в созданное событие. Для нового заказа нажмите «Сбросить всё».
    </p>}
  </>;
}
