import React, { useMemo, useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, MessageCircle } from "lucide-react";
import maxIcon from "@/assets/max-icon.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reachGoal } from "@/lib/metrika";
import ConsentCheckbox from "@/components/ConsentCheckbox";
import { appendLeadTracking } from "@/lib/leadTracking";

interface ContactsProps {
  prefilledMessage?: string;
}

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfb28U4RIVI2K9h6cyjSbwxRqMVMUyUeuKuQADfPWonb71ypQ/formResponse";

async function sendToGoogleForm(payload: {
  name: string;
  phone: string;
  email?: string;
  message?: string;
}) {
  const body = new URLSearchParams();
  body.append("entry.727782635", payload.name || "");
  body.append("entry.1862926664", payload.phone || "");
  body.append("entry.557277616", payload.email || "");
  body.append("entry.1008164226", payload.message || "");

  await fetch(GOOGLE_FORM_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
}

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  return digits.length === 11 && digits.startsWith("7") ? `+${digits}` : "";
}

const Contacts = ({ prefilledMessage = "" }: ContactsProps) => {
  const contactInfo = useMemo(
    () => [
      {
        icon: Phone,
        label: "Телефон",
        value: "+7 900 288-52-55",
        href: "tel:+79002885255",
      },
      {
        icon: Mail,
        label: "Email",
        value: "imperiableska2025@gmail.com",
        href: "mailto:imperiableska2025@gmail.com",
      },
      {
        icon: MapPin,
        label: "Адрес",
        value: "г. Сочи, ул. Донская, 12",
        href: "https://maps.google.com/?q=Сочи,ул.Донская,12",
      },
      {
        icon: Clock,
        label: "Часы работы",
        value: "Ежедневно с 8:00 до 23:00",
        href: null as string | null,
      },
    ],
    []
  );

  const whatsappUrl = "https://wa.me/79002885255";
  const telegramUrl = "https://t.me/+79002885255";
  const maxUrl =
    "https://max.ru/u/f9LHodD0cOJtMUjlrXWI6y94fo8f8qPlmQdiA50RMF8i1MsNISiZPv1iKWk";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(prefilledMessage);
  const [consent, setConsent] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  React.useEffect(() => {
    setMessage(prefilledMessage || "");
  }, [prefilledMessage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSending) return;

    const n = name.trim();
    const p = normalizePhone(phone.trim());
    const msg = appendLeadTracking(message.trim());

    if (!p || !consent) {
      setStatus("error");
      return;
    }

    try {
      setIsSending(true);
      setStatus("idle");

      await sendToGoogleForm({
        name: n,
        phone: p,
        email: "",
        message: msg,
      });

      reachGoal("form_submit", { form: "main_contact_form" });
      setStatus("success");

      setName("");
      setPhone("");
      setMessage(prefilledMessage || "");
      setConsent(false);
    } catch (err) {
      console.error(err);
      reachGoal("form_error", { form: "main_contact_form" });
      setStatus("error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section id="contacts" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-muted/50 to-background" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Контакты
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Готовы
            <span className="text-gradient"> помочь?</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Свяжитесь с нами любым удобным способом или оставьте заявку
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
              {contactInfo.map((item, index) => (
                <div
                  key={index}
                  className="group p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  {item.href ? (
                    <a
                      href={item.href}
                      className="flex items-start gap-4"
                      onClick={() => {
                        if (item.href?.startsWith("tel:")) {
                          reachGoal("phone_click");
                        }
                      }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {item.value}
                        </p>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                        <p className="font-medium">{item.value}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
              <p className="font-heading font-bold mb-3">Напишите нам в мессенджер</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">WhatsApp</span>
                </a>

                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <Send className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Telegram</span>
                </a>

                <a
                  href={maxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <img src={maxIcon} alt="Max" className="w-5 h-5 rounded" />
                  <span className="text-sm font-medium">Max</span>
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="p-8 rounded-3xl bg-card border border-border shadow-xl">
              <h3 className="font-heading text-2xl font-bold mb-2">Оставить заявку</h3>
              <p className="text-muted-foreground mb-6">
                Оставьте телефон — перезвоним в течение 2 минут и назовём стоимость
              </p>

              <form className="space-y-5" onSubmit={handleSubmit} data-track-form="main_contact_form">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="text-sm font-medium">Имя</label>
                    <Input
                      id="contact-name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Как к вам обращаться?"
                      className="rounded-xl h-12 bg-muted/50 border-border focus:border-primary"
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="contact-phone" className="text-sm font-medium">
                      Телефон <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="contact-phone"
                      name="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      className="rounded-xl h-12 bg-muted/50 border-border focus:border-primary"
                      autoComplete="tel"
                      required
                    />
                    {status === "error" && !normalizePhone(phone) && (
                      <p className="text-xs text-destructive">Укажите телефон</p>
                    )}
                  </div>
                </div>

                <ConsentCheckbox id="contact-consent" checked={consent} onChange={setConsent} />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-full shadow-lg shadow-primary/25 hero-gradient"
                  disabled={isSending || !consent}
                >
                  {isSending
                    ? "Отправляем..."
                    : status === "success"
                    ? "Заявка отправлена ✅"
                    : "Отправить заявку"}
                </Button>

                {status === "success" && (
                  <p className="text-xs text-muted-foreground text-center">
                    Спасибо! Мы получили заявку и скоро свяжемся с вами.
                  </p>
                )}

                {status === "error" && normalizePhone(phone) && (
                  <p className="text-xs text-destructive text-center">
                    Не удалось отправить заявку. Попробуйте ещё раз или напишите в мессенджер.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contacts;
