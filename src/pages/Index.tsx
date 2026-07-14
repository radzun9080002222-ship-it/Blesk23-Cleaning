import { useState } from 'react';
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Gallery from "@/components/Gallery";
import Pricing from "@/components/Pricing";
import Reviews from "@/components/Reviews";
import Contacts from "@/components/Contacts";
import Footer from "@/components/Footer";
import PublicCleaningCalculator from "@/components/calculator/PublicCleaningCalculator";

const Index = () => {
  const [prefilledMessage, setPrefilledMessage] = useState('');

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <PublicCleaningCalculator />
      <Services />
      <About />
      <Gallery />
      <Pricing onSelectPlan={(plan) => setPrefilledMessage(`Здравствуйте! Хочу заказать: ${plan}`)} />
      <Reviews />
      <Contacts prefilledMessage={prefilledMessage} />
      <Footer />
    </div>
  );
};

export default Index;
