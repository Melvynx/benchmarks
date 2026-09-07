import { useEffect, useState } from "react";
import { useParallax } from "../lib/motion";

export const LandingHero = () => {
  const { sectionRef, layerRef } = useParallax<HTMLElement>(0.35);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const enter = (delay: number) =>
    `transition-all duration-1000 ease-out ${
      mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
    }` + ` [transition-delay:${delay}ms]`;

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative flex min-h-svh flex-col overflow-hidden"
      aria-label="SaveIt.now introduction"
    >
      {/* Campaign image */}
      <div ref={layerRef} className="absolute -inset-y-16 inset-x-0">
        <img
          src="/images/landing-v2/portal-ridge.png"
          alt="A glowing doorway standing open on a flower-covered mountain ridge at dusk"
          className="animate-kenburns size-full object-cover"
          fetchPriority="high"
        />
      </div>

      {/* Scrims */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-coal/70 via-coal/10 to-coal" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-coal/50 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-16 pt-32 sm:px-8 sm:pb-20">
        <div className={enter(100)}>
          <p className="kicker text-ink/90">
            SaveIt.now · Your home for bookmarks
          </p>
        </div>

        <div className="mt-6 grid items-end gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
          <h1
            className={`${enter(200)} text-[clamp(4rem,13vw,11.5rem)] font-semibold leading-[0.86] tracking-[-0.045em] text-ink`}
          >
            k3[1m]
          </h1>

          <div className={`${enter(350)} max-w-sm pb-2 lg:pb-4`}>
            <p className="text-balance text-base leading-relaxed text-ink/85 sm:text-lg">
              Save anything in one tap. Your agent reads it, files it, and
              brings it back the moment you ask. No folders, no busywork. Just
              saved.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="/signin?intent=signup&step=email"
                className="inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-semibold text-coal transition-all duration-300 hover:bg-flare hover:shadow-[0_0_40px_-8px] hover:shadow-flare/60"
              >
                Start saving free
              </a>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center rounded-full border border-ink/25 px-7 text-sm font-medium text-ink backdrop-blur-sm transition-colors duration-300 hover:border-ink/60 hover:bg-ink/5"
              >
                Watch it work
              </a>
            </div>
            <p className="mt-5 text-[13px] tracking-wide text-ink/60">
              Free forever plan · No credit card · Set up in two minutes
            </p>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        className={`${enter(700)} absolute right-8 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-4 lg:flex`}
        aria-hidden="true"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-ink/60 [writing-mode:vertical-lr]">
          Scroll
        </span>
        <span className="h-16 w-px overflow-hidden bg-ink/15">
          <span className="scroll-cue-line block h-full w-full bg-ink/80" />
        </span>
      </div>
    </section>
  );
};
