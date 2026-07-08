import bathroomImage from '@/assets/bathroom-cleaning.webp';
import kitchenImage from '@/assets/kitchen-cleaning.webp';
import windowImage from '@/assets/window-cleaning.webp';
import steamImage from '@/assets/steam-cleaning.webp';

const Gallery = () => {
  const images = [
    { src: bathroomImage, alt: 'Уборка ванной комнаты', title: 'Ванные комнаты' },
    { src: kitchenImage, alt: 'Уборка кухни', title: 'Кухни' },
    { src: windowImage, alt: 'Мытье окон', title: 'Окна' },
    { src: steamImage, alt: 'Паровая чистка', title: 'Паровая чистка' },
  ];

  return (
    <section id="gallery" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Наши работы
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Результаты
            <span className="text-gradient"> нашей работы</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Посмотрите, как мы превращаем пространства в идеально чистые
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {images.map((image, index) => (
            <div
              key={index}
              className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                className="w-full h-72 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Title */}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="font-heading font-bold text-lg text-foreground">{image.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
