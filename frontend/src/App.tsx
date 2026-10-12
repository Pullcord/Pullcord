import { useState } from "react";
import { Footer, Header, TestnetBadge } from "./components/Chrome";
import { DemoNotice } from "./components/DemoNotice";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Wizard } from "./components/Wizard";
import { NoticePreview } from "./components/NoticePreview";
import { Manage } from "./components/Manage";
import { Stats } from "./components/Stats";

export default function App() {
  const [sound, setSound] = useState(false); // apagado por defecto
  return (
    <div id="top">
      <a href="#suscribir" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-bg focus:p-2">
        Saltar al flujo de suscripción
      </a>
      <Header />
      <TestnetBadge />
      <main>
        <Hero sound={sound} setSound={setSound} />
        <HowItWorks />
        <Wizard />
        <NoticePreview />
        <Manage />
        <Stats />
      </main>
      <DemoNotice />
      <Footer />
    </div>
  );
}
