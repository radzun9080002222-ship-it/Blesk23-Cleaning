import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Consent = () => (
  <>
    <Helmet>
      <title>Согласие на обработку персональных данных | Империя Блеска</title>
      <meta name="robots" content="noindex, follow" />
      <link rel="canonical" href="https://www.blesk23.ru/consent" />
    </Helmet>

    <Header />
    <main className="pt-32 pb-20">
      <div className="container mx-auto max-w-3xl px-4">
        <h1 className="mb-8 font-heading text-3xl font-bold md:text-4xl">
          Согласие на обработку персональных данных
        </h1>
        <div className="space-y-6 leading-relaxed text-muted-foreground">
          <p>
            Устанавливая отметку в форме и отправляя заявку на сайте blesk23.ru, я свободно, своей волей
            и в своём интересе даю ООО «ИМПЕРИЯ БЛЕСКА» (ИНН 2367029343, ОГРН 1232300006608) согласие
            на обработку моих персональных данных.
          </p>
          <h2 className="font-heading text-xl font-bold text-foreground">Состав данных</h2>
          <p>Имя, номер телефона, адрес электронной почты, текст сообщения и сведения об источнике заявки.</p>
          <h2 className="font-heading text-xl font-bold text-foreground">Цели обработки</h2>
          <p>Обработка заявки, расчёт стоимости, обратная связь и заключение договора на оказание услуг.</p>
          <h2 className="font-heading text-xl font-bold text-foreground">Действия с данными</h2>
          <p>
            Сбор, запись, систематизация, хранение, уточнение, использование, передача привлекаемым
            обработчикам в объёме, необходимом для обработки заявки, блокирование и удаление.
          </p>
          <h2 className="font-heading text-xl font-bold text-foreground">Срок и отзыв согласия</h2>
          <p>
            Согласие действует до достижения целей обработки или его отзыва. Отозвать согласие можно
            письмом на imperiableska2025@gmail.com. После получения отзыва обработка прекращается, кроме
            случаев, когда продолжение обработки допускается законом.
          </p>
          <p>Дата редакции: 10 июля 2026 года.</p>
        </div>
      </div>
    </main>
    <Footer />
  </>
);

export default Consent;
