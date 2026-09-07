"use client";

import { LandingHeader } from "./components/landing-header";
import { LandingHero } from "./components/landing-hero";
import { HomeSanctuary } from "./components/home-sanctuary";
import { AgenticWorkflow } from "./components/agentic-workflow";
import { RediscoveryPromise } from "./components/rediscovery-promise";
import { IosExperience } from "./components/ios-experience";
import { ExtensionsSection } from "./components/extensions-section";
import { LandingPricing } from "./components/landing-pricing";
import { FAQ } from "./components/faq";
import { ClosingCta } from "./components/closing-cta";
import { Footer } from "./components/footer";

export function App() {
  return (
    <div className="landing-page min-h-screen bg-[#090708] text-[#f7f3ee]">
      <LandingHeader />
      <main>
        <LandingHero />
        <HomeSanctuary />
        <AgenticWorkflow />
        <RediscoveryPromise />
        <IosExperience />
        <ExtensionsSection />
        <LandingPricing />
        <FAQ />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
