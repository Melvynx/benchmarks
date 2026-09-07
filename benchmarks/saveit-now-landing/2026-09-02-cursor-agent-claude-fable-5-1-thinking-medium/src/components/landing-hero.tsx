import { ArrowDownIcon, ArrowRightIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { images } from "../lib/images";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { CampaignPicture } from "./campaign-image";
import { LandingAppButton } from "./landing-app-button";

const SAVE_TYPES = [
  "Articles",
  "YouTube videos",
  "Threads",
  "PDFs",
  "Recipes",
  "Repositories",
  "Newsletters",
  "Product pages",
  "Podcasts",
  "Design references",
  "Research papers",
  "Tweets",
];

export const LandingHero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.min(window.scrollY, window.innerHeight);
      section.style.setProperty("--scroll", String(y));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
      aria-labelledby="hero-title"
    >
      <CampaignPicture
        image={images.ridge}
        priority
        className="parallax absolute inset-0 -z-20"
        imgClassName="object-[50%_60%] sm:object-center"
        sizes="100vw"
      />

      {/* Cinematic grading: vignette, top fade for the header, bottom fade into the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_100%,transparent_30%,rgb(12_10_16/0.7)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-ink/80 via-ink/30 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%] bg-gradient-to-t from-ink via-ink/85 to-transparent"
      />
      <div
        aria-hidden
        className="anim-glow pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[40vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_200_150/0.45)_0%,rgb(255_122_26/0.18)_40%,transparent_70%)] blur-2xl"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-10 pt-40 sm:px-8 sm:pb-14 lg:pb-16">
        <div className="max-w-4xl">
          <p
            className="anim-rise inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-ink/40 px-3.5 py-1.5 text-[12.5px] font-medium tracking-[0.08em] text-blush uppercase backdrop-blur-md"
            style={{ "--delay": "80ms" } as React.CSSProperties}
          >
            <span className="size-1.5 rounded-full bg-ember shadow-[0_0_12px_2px_rgb(255_122_26/0.8)]" />
            SaveIt.now, your home for bookmarks
          </p>

          <h1
            id="hero-title"
            className="anim-rise font-display mt-6 text-[clamp(3.25rem,10vw,7.5rem)] leading-[0.92] tracking-[-0.03em] text-cream"
            style={{ "--delay": "180ms" } as React.CSSProperties}
          >
            Claude Fable 5.1
          </h1>

          <p
            className="anim-rise font-display mt-5 max-w-3xl text-[clamp(1.75rem,4.2vw,3.25rem)] leading-[1.02] tracking-[-0.02em] text-sand"
            style={{ "--delay": "280ms" } as React.CSSProperties}
          >
            Just save it.{" "}
            <em className="text-ember-gradient not-italic">
              It comes back when you need it.
            </em>
          </p>

          <p
            className="anim-rise mt-6 max-w-xl text-[17px] leading-relaxed text-sand/90 sm:text-lg"
            style={{ "--delay": "380ms" } as React.CSSProperties}
          >
            SaveIt.now captures, understands, and organizes everything you save.
            No folders to maintain, no tags to remember, no tabs left open just
            in case. Ask for it later in plain words and it is there.
          </p>

          <div
            className="anim-rise mt-8 flex flex-wrap items-center gap-3"
            style={{ "--delay": "480ms" } as React.CSSProperties}
          >
            <LandingAppButton size="lg" variant="ember">
              Start saving free
              <ArrowRightIcon className="size-4" />
            </LandingAppButton>
            <a
              href="#workflow"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-ink/30 px-6 text-[15px] font-medium text-cream backdrop-blur-md transition-colors hover:border-white/40 hover:bg-ink/50 sm:h-13 sm:px-7"
            >
              See how it works
              <ArrowDownIcon className="size-4 text-blush" />
            </a>
          </div>

          <p
            className="anim-fade mt-5 text-[13px] text-dune"
            style={{ "--delay": "700ms" } as React.CSSProperties}
          >
            Free plan included. No credit card required. Works in your browser
            and on iPhone.
          </p>
        </div>
      </div>

      {/* Ticker of what people save */}
      <div
        className="anim-fade relative border-t border-white/10 bg-ink/40 backdrop-blur-md"
        style={{ "--delay": "900ms" } as React.CSSProperties}
        role="group"
        aria-label="Kinds of content you can save"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4 sm:px-8">
          <span className="shrink-0 text-[11px] font-medium tracking-[0.14em] text-dune uppercase">
            Save anything
          </span>
          <div
            className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]"
            aria-hidden
          >
            <div className="anim-marquee flex w-max gap-3">
              {[...SAVE_TYPES, ...SAVE_TYPES].map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] whitespace-nowrap text-sand"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
