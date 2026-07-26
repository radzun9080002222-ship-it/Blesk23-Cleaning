import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import { reachGoal } from '@/lib/metrika';
import ConsentCheckbox from '@/components/ConsentCheckbox';
import { appendLeadTracking } from '@/lib/leadTracking';

const GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfb28U4RIVI2K9h6cyjSbwxRqMVMUyUeuKuQADfPWonb71ypQ/formResponse';

async function sendToGoogleForm(payload: { name: string; phone: string }) {
  const body = new URLSearchParams();
  body.append('entry.727782635', payload.name || '');
  body.append('entry.1862926664', payload.phone || '');
  body.append('entry.557277616', '');
  body.append(
    'entry.1008164226',
    appendLeadTracking('Заявка с лендинга «Уборка после ремонта» (/uborka-posle-remonta-sochi)')
  );

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
  const p = d.slice(0, 11);
  const a = p.slice(1, 4);
  const b = p.slice(4, 7);
  const c = p.slice(7, 9);
  const e = p.slice(9, 11);
  let out = '+7';
  if (a) out += ` (${a}`;
  if (a.length === 3) out += ')';
  if (b) out += ` ${b}`;
  if (c) out += `-${c}`;
  if (e) out += `-${e}`;
  return out;
};

const RepairLeadForm = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(false);
  const [consent, setConsent] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const valid = name.trim().length >= 2 && phoneDigits.length >= 10 && phoneDigits.length <= 15 && consent;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    if (!valid) { setError(true); return; }

    try {
      setIsSending(true);
      setError(false);
      await sendToGoogleForm({ name: name.trim(), phone: phone.trim() });
      reachGoal('form_submit', { form: 'repair_lead_form' });
      setSent(true);
    } catch (err) {
      console.error(err);
      reachGoal('form_error', { form: 'repair_lead_form' });
      setError(true);
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl bg-white border border-[#DDEBE8] p-8 text-center shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)]">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="font-heading text-2xl font-bold mb-2 text-[#0D4D49]">Спасибо!</h3>
        <p className="text-muted-foreground">
          Ответим в течение 2 минут с точной ценой и ближайшей датой.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      data-track-form="repair_lead_form"
      className="rounded-3xl bg-white border border-[#DDEBE8] p-6 md:p-8 shadow-[0_8px_40px_-12px_rgba(0,63,59,0.15)] space-y-4"
    >
      <div>
        <h3 className="font-heading text-xl font-bold text-[#0D4D49]">
          Получить точный расчёт
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Перезвоним за 2 минуты, скажем точную цену и дату.
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

      <ConsentCheckbox id="repair-consent" checked={consent} onChange={setConsent} />

      <Button
        type="submit"
        size="lg"
        disabled={isSending}
        className="w-full h-12 rounded-xl hero-gradient text-white font-semibold"
      >
        {isSending ? 'Отправляем...' : 'Получить точный расчёт'}
      </Button>

      {error && (
        <p className="text-xs text-destructive text-center">
          Не отправилось. Проверьте имя и телефон и поставьте галочку согласия ниже — или напишите нам в мессенджер.
        </p>
      )}
    </form>
  );
};

export default RepairLeadForm;
