import { AgenticFlow } from "./components/agentic-flow";
import { CaptureAnywhere } from "./components/capture-anywhere";
import { ClosingCta } from "./components/closing-cta";
import { Faq } from "./components/faq";
import { Hero } from "./components/hero";
import { IosSection } from "./components/ios-section";
import { Pricing } from "./components/pricing";
import { RediscoveryPromise } from "./components/promise";
import { SaveStrip } from "./components/save-strip";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { Transformation } from "./components/transformation";

/**
 * The page runs as one continuous dusk: the campaign plates carry the hero,
 * the mechanism, the promise, iOS, pricing and the close, with quieter type
 * only sections between them so the artwork keeps its impact.
 */
export function App() {
  return (
    <div className="page-grain relative min-h-screen bg-ink">
      <SiteHeader />
      <main id="main">
        <Hero />
        <SaveStrip />
        <Transformation />
        <AgenticFlow />
        <CaptureAnywhere />
        <RediscoveryPromise />
        <IosSection />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
