import { ExtensionsSection } from "./components/extensions-section";
import { FAQ } from "./components/faq";
import { Footer } from "./components/footer";
import { HowItWorks } from "./components/how-it-works";
import { LandingHeader } from "./components/landing-header";
import { LandingHero } from "./components/landing-hero";
import { LandingPricing } from "./components/landing-pricing";
import { LandingStats } from "./components/landing-stats";
import { WhySaveIt } from "./components/why-saveit";

export function App() {
  return (
    <div className="landing-page min-h-screen">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingStats />
        <WhySaveIt />
        <HowItWorks />
        <ExtensionsSection />
        <LandingPricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
