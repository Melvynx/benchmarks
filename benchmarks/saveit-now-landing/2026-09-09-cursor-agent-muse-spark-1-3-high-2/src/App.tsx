import { ExtensionsSection } from "./components/extensions-section";
import { FAQ } from "./components/faq";
import { Footer } from "./components/footer";
import { HowItWorks } from "./components/how-it-works";
import { LandingHeader } from "./components/landing-header";
import { LandingHero } from "./components/landing-hero";
import { LandingPricing } from "./components/landing-pricing";
import { LandingStats } from "./components/landing-stats";
import { WhySaveIt } from "./components/why-saveit";
import { useReveal } from "./components/reveal";

export function App() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} className="landing-page min-h-screen">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <LandingHeader />
      <main id="main">
        <LandingHero />
        <HowItWorks />
        <LandingStats />
        <WhySaveIt />
        <ExtensionsSection />
        <LandingPricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
