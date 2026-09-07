import { AskDemo } from "./components/ask-demo";
import { CaptureStrip } from "./components/capture-strip";
import { ClosingCTA } from "./components/closing-cta";
import { FAQ } from "./components/faq";
import { Footer } from "./components/footer";
import { Hero } from "./components/hero";
import { IOS } from "./components/ios";
import { Pricing } from "./components/pricing";
import { Promise } from "./components/promise";
import { SiteHeader } from "./components/site-header";
import { Transformation } from "./components/transformation";
import { Workflow } from "./components/workflow";
import { useRevealObserver } from "./lib/motion";

export function App() {
  // One observer drives every [data-reveal] on the page.
  useRevealObserver();

  return (
    <div className="landing-page min-h-screen">
      <a
        href="#workflow"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-cream focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-ink"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main>
        <Hero />
        <CaptureStrip />
        <Transformation />
        <Workflow />
        <AskDemo />
        <Promise />
        <IOS />
        <Pricing />
        <FAQ />
        <ClosingCTA />
      </main>

      <Footer />
    </div>
  );
}
