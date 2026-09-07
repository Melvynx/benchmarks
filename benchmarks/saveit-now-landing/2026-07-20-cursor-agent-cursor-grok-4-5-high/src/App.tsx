import { ClosingCta } from "./components/closing-cta";
import { FAQ } from "./components/faq";
import { Footer } from "./components/footer";
import { HowItWorks } from "./components/how-it-works";
import { IosSection } from "./components/ios-section";
import { LandingHeader } from "./components/landing-header";
import { LandingHero } from "./components/landing-hero";
import { LandingPricing } from "./components/landing-pricing";
import { PromiseSection } from "./components/promise-section";

export function App() {
  return (
    <div className="landing-page min-h-screen">
      <LandingHeader />
      <main>
        <LandingHero />
        <HowItWorks />
        <PromiseSection />
        <IosSection />
        <LandingPricing />
        <FAQ />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
