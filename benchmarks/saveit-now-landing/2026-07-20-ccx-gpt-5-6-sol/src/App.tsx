import { useEffect } from "react";

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
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    document.documentElement.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page" id="top">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <LandingHeader />
      <main id="main-content">
        <LandingHero />
        <WhySaveIt />
        <HowItWorks />
        <LandingStats />
        <ExtensionsSection />
        <LandingPricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
