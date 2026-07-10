import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Requisites = () => (
  <>
    <Helmet>
      <title>Реквизиты | Империя Блеска</title>
      <meta name="description" content="Реквизиты и контактные данные ООО «ИМПЕРИЯ БЛЕСКА»." />
      <link rel="canonical" href="https://www.blesk23.ru/requisites" />
    </Helmet>
    <Header />
    <main className="pt-32 pb-20">
      <div className="container mx-auto max-w-3xl px-4">
        <h1 className="mb-8 font-heading text-3xl font-bold md:text-4xl">Реквизиты</h1>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <dl className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-muted-foreground">Полное наименование</dt>
            <dd>Общество с ограниченной ответственностью «ИМПЕРИЯ БЛЕСКА»</dd>
            <dt className="font-medium text-muted-foreground">ИНН</dt><dd>2367029343</dd>
            <dt className="font-medium text-muted-foreground">ОГРН</dt><dd>1232300006608</dd>
            <dt className="font-medium text-muted-foreground">Юридический адрес</dt>
            <dd>354340, Краснодарский край, г. Сочи, ул. Изумрудная, д. 42, кв. 112</dd>
            <dt className="font-medium text-muted-foreground">Адрес обслуживания</dt>
            <dd>г. Сочи, ул. Донская, 12</dd>
            <dt className="font-medium text-muted-foreground">Телефон</dt>
            <dd><a className="text-primary hover:underline" href="tel:+79002885255">+7 900 288-52-55</a></dd>
            <dt className="font-medium text-muted-foreground">E-mail</dt>
            <dd><a className="text-primary hover:underline" href="mailto:imperiableska2025@gmail.com">imperiableska2025@gmail.com</a></dd>
          </dl>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default Requisites;
