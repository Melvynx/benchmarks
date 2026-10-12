import { Closing } from "./components/closing";
import { FAQ } from "./components/faq";
import { Hero } from "./components/hero";
import { IosSection } from "./components/ios-section";
import { Pricing } from "./components/pricing";
import { PromiseSection } from "./components/promise";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { Workflow } from "./components/workflow";

export function App() {
  return (
    <div className="min-h-screen bg-ink text-ivory">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Workflow />
        <PromiseSection />
        <IosSection />
        <Pricing />
        <FAQ />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
