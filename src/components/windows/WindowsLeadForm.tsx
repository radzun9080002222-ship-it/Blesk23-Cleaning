import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { reachGoal } from '@/lib/metrika';
import maxIcon from '@/assets/max-icon.webp';
import ConsentCheckbox from '@/components/ConsentCheckbox';
import { appendLeadTracking } from '@/lib/leadTracking';

const GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfb28U4RIVI2K9h6cyjSbwxRqMVMUyUeuKuQADfPWonb71ypQ/formResponse';

const waUrl = 'https://wa.me/79002885255';
const tgUrl = 'https://t.me/+79002885255';
const maxUrl =
  'https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk';

async function send(payload: { name: string; phone: string; comment: string }) {
  const body = new URLSearchParams();
  body.append('entry.727782635', payload.name);
  body.append('entry.1862926664', payload.phone);
  body.append('entry.557277616', '');
  body.append('entry.1008164226', payload.comment);
  await fetch(GOOGLE_FORM_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  });
}

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '').replace(/^8/, '7').slice(0, 11);
  const d = digits.startsWith('7') ? digits : '7' + digits;
  const a = d.slice(1, 4);
  const b = d.slice(4, 7);
  const c = d.slice(7, 9);
  const e = d.slice(9, 11);
  let out = '+7';
  if (a) out += ` (${a}`;
  if (a.length === 3) out += ')';
  if (b) out += ` ${b}`;
  if (c) out += `-${c}`;
  if (e) out += `-${e}`;
  return out;
};

type Props = {
  composition?: string;
  totalLabel?: string;
  tariffLabel?: string;
};

const WindowsLeadForm = ({ composition = '', totalLabel = '', tariffLabel = '' }: Props) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [consent, setConsent] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const valid = name.trim().length >= 2 && digits.length >= 10 && digits.length <= 15 && consent;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!valid) { setError(true); return; }
    try {
      setBusy(true);
      setError(false);
      const comment =
        `Заявка с лендинга «Мойка окон» (/moyka-okon-sochi). ` +
        (tariffLabel ? `Тариф: ${tariffLabel}. ` : '') +
        (totalLabel ? `Расчёт: ${totalLabel}. ` : '') +
        (composition ? `Состав: ${composition}` : '');
      await send({ name: name.trim(), phone: phone.trim(), comment: appendLeadTracking(comment) });
      reachGoal('form_submit', { form: 'windows_lead_form' });
      setSent(true);
    } catch {
      reachGoal('form_error', { form: 'windows_lead_form' });
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl bg-white border border-[#DDEBE8] p-8 text-center shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)]">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="font-heading text-2xl font-bold mb-2 text-[#0D4D49]">Спасибо!</h3>
        <p className="text-muted-foreground">
          Перезвоним за 2 минуты, назовём точную цену и время.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      data-track-form="windows_lead_form"
      className="rounded-3xl bg-white border border-[#DDEBE8] p-6 md:p-7 shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)] space-y-3"
    >
      <div>
        <h3 className="font-heading text-xl font-bold text-[#0D4D49]">
          Получить точный расчёт
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Перезвоним за 2 минуты, назовём точную цену и время.
        </p>
      </div>

      <Input
        aria-label="Ваше имя"
        name="name"
        placeholder="Ваше имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-12 rounded-xl"
        required
        minLength={2}
      />
      <Input
        aria-label="Телефон"
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="+7 (___) ___-__-__"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        className="h-12 rounded-xl"
        required
      />

      <ConsentCheckbox id="windows-consent" checked={consent} onChange={setConsent} />

      <Button
        type="submit"
        size="lg"
        disabled={busy}
        className="w-full h-12 rounded-xl hero-gradient text-white font-semibold"
      >
        {busy ? 'Отправляем…' : 'Получить расчёт'}
      </Button>

      {error && (
        <p className="text-xs text-destructive text-center">
          Не отправилось. Проверьте имя и телефон и поставьте галочку согласия ниже — или напишите нам в мессенджер.
        </p>
      )}
      <div className="pt-2 border-t border-[#DDEBE8]">
        <p className="text-xs text-center text-muted-foreground mb-2">Или напишите сразу:</p>
        <div className="grid grid-cols-3 gap-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-10 rounded-xl bg-[#25D366] text-white text-xs font-semibold gap-1"
          >
            <MessageCircle className="w-4 h-4" />
            WA
          </a>
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-10 rounded-xl bg-[#229ED9] text-white text-xs font-semibold gap-1"
          >
            <Send className="w-4 h-4" />
            TG
          </a>
          <a
            href={maxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-10 rounded-xl bg-white border border-[#DDEBE8] text-[#0D4D49] text-xs font-semibold gap-1"
          >
            <img src={maxIcon} alt="" className="w-4 h-4 rounded" />
            Max
          </a>
        </div>
      </div>
    </form>
  );
};

export default WindowsLeadForm;
