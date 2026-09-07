import { LandingAppButton } from "./landing-app-button";
import { Reveal } from "./reveal";

export const ClosingCta = () => {
  return (
    <section className="relative overflow-hidden">
      {/* The lit house on the hill: home for bookmarks */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src="/images/landing-v2/home.jpg"
          alt=""
          className="size-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0e0a11_0%,rgba(14,10,17,0.15)_45%,rgba(14,10,17,0.65)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-36 text-center sm:py-48">
        <Reveal>
          <h2 className="font-display text-5xl leading-[1.02] tracking-tight text-cream drop-shadow-[0_2px_24px_rgba(14,10,17,0.8)] sm:text-6xl lg:text-7xl">
            Your home for bookmarks{" "}
            <em className="text-ember-soft">is waiting.</em>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-cream/80 sm:text-lg">
            Save the next thing you find. The agent takes it from there.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LandingAppButton signedOutChildren="Start saving free" />
            <a
              href="#pricing"
              className="inline-flex h-11 items-center rounded-full border border-cream/25 bg-ink/30 px-6 text-sm font-medium text-cream backdrop-blur-md transition-all duration-300 hover:border-cream/45 hover:bg-ink/50"
            >
              See pricing
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
