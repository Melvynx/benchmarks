import { useParallax } from "../lib/motion";
import { Reveal } from "./reveal";

export const ClosingCta = () => {
  const { sectionRef, layerRef } = useParallax<HTMLElement>(0.25);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[90svh] items-center justify-center overflow-hidden"
      aria-label="Get started with SaveIt.now"
    >
      <div ref={layerRef} className="absolute -inset-y-16 inset-x-0">
        <img
          src="/images/landing-v2/home.png"
          alt="A small house with glowing windows on a flower-covered hill at dusk, a stone path leading up to it"
          className="size-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-coal/45" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-coal to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-coal-deep to-transparent" />

      <div className="relative z-10 px-6 py-28 text-center">
        <Reveal>
          <p className="kicker justify-center text-ink/85">
            Your home for bookmarks
          </p>
          <h2 className="mt-6 text-balance font-display text-5xl leading-[1.02] tracking-tight text-ink drop-shadow-[0_2px_20px_rgba(20,13,10,0.7)] sm:text-6xl lg:text-7xl">
            Welcome <em className="display-italic">home.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-balance text-base leading-relaxed text-ink/85 drop-shadow-[0_1px_12px_rgba(20,13,10,0.7)]">
            Every save keeps the light on. Start your free library today and
            never lose a link again.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/signin?intent=signup&step=email"
              className="inline-flex h-12 items-center rounded-full bg-ink px-8 text-sm font-semibold text-coal transition-all duration-300 hover:bg-flare hover:shadow-[0_0_50px_-8px] hover:shadow-flare/60"
            >
              Start saving free
            </a>
            <a
              href="#pricing"
              className="inline-flex h-12 items-center rounded-full border border-ink/30 px-8 text-sm font-medium text-ink backdrop-blur-sm transition-colors duration-300 hover:border-ink/70 hover:bg-ink/5"
            >
              See pricing
            </a>
          </div>
          <p className="mt-6 text-[13px] tracking-wide text-ink/65">
            Free forever plan · No credit card
          </p>
        </Reveal>
      </div>
    </section>
  );
};
