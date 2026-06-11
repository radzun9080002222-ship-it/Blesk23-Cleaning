import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2 } from 'lucide-react';
import { reachGoal } from '@/lib/metrika';

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

  const phoneDigits = phone.replace(/\D/g, '');
  const valid = name.trim().length >= 2 && phoneDigits.length === 11;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    reachGoal('form_submit');
    // Lightweight lead delivery via mailto fallback — replace with backend later
    try {
      const subj = encodeURIComponent('Заявка с лендинга «Уборка после ремонта»');
      const body = encodeURIComponent(`Имя: ${name}\nТелефон: ${phone}\nИсточник: /uborka-posle-remonta-sochi`);
      window.open(`mailto:imperiableska2025@gmail.com?subject=${subj}&body=${body}`, '_blank');
    } catch {}
    setSent(true);
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
        placeholder="Ваше имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-12 rounded-xl"
        required
        minLength={2}
      />
      <Input
        type="tel"
        inputMode="tel"
        placeholder="+7 (___) ___-__-__"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        className="h-12 rounded-xl"
        required
      />

      <Button
        type="submit"
        size="lg"
        disabled={!valid}
        className="w-full h-12 rounded-xl hero-gradient text-white font-semibold"
      >
        Получить точный расчёт
      </Button>

      <p className="text-[11px] text-muted-foreground text-center leading-snug">
        Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.
      </p>
    </form>
  );
};

export default RepairLeadForm;
