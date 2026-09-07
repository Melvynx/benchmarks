import { ClosingCta } from "./components/closing-cta";
import { FAQ } from "./components/faq";
import { Footer } from "./components/footer";
import { IosSection } from "./components/ios-section";
import { LandingHeader } from "./components/landing-header";
import { LandingHero } from "./components/landing-hero";
import { LandingPricing } from "./components/landing-pricing";
import { PromiseSection } from "./components/promise-section";
import { Workflow } from "./components/workflow";

export function App() {
  return (
    <div className="landing-page min-h-screen">
      <a className="skip-link" href="#workflow">
        Skip to content
      </a>
      <LandingHeader />
      <main>
        <LandingHero />
        <Workflow />
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
