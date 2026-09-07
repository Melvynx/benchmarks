import { LandingAppButton } from "./landing-app-button";

export const LandingHero = () => {
  return (
    <section className="relative flex min-h-[100svh] items-end justify-center overflow-hidden sm:items-center">
      {/* Campaign backdrop: the lit doorway on the ridge */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src="/images/landing-v2/portal-ridge.jpg"
          alt=""
          className="hero-zoom size-full object-cover object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/10 to-ink" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,transparent_0%,rgba(14,10,17,0.4)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pb-28 pt-36 text-center sm:pb-24">
        <p className="inline-flex items-center gap-2 rounded-full border border-cream/20 bg-ink/40 px-4 py-1.5 text-[10px] tracking-[0.18em] whitespace-nowrap text-ember-soft uppercase backdrop-blur-md sm:text-[12px]">
          SaveIt.now
          <span className="size-1 rounded-full bg-ember" aria-hidden="true" />
          Your home for bookmarks
        </p>

        <h1 className="mt-8 font-display text-6xl leading-[0.95] tracking-tight text-cream drop-shadow-[0_2px_20px_rgba(14,10,17,0.7)] sm:text-7xl lg:text-[6.5rem]">
          Claude Fable 5
        </h1>

        <p className="mt-6 font-display text-2xl italic text-ember-soft drop-shadow-[0_2px_14px_rgba(14,10,17,0.9)] sm:text-3xl">
          No folders. No filing. Just save it.
        </p>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg">
          An agent reads everything you save, names it, tags it, and files it
          away. The moment you ask, it walks it right back through the door.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <LandingAppButton signedOutChildren="Start saving free" />
          <a
            href="#demo"
            className="inline-flex h-11 items-center rounded-full border border-cream/20 bg-ink/30 px-6 text-sm font-medium text-cream backdrop-blur-md transition-all duration-300 hover:border-cream/40 hover:bg-ink/50"
          >
            Watch the agent work
          </a>
        </div>

        <p className="mt-5 text-[13px] text-cream/50">
          Free plan included. No credit card.
        </p>
      </div>

      <div
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 sm:flex"
        aria-hidden="true"
      >
        <span className="text-[11px] tracking-[0.3em] text-cream/40 uppercase">
          Scroll
        </span>
        <span className="cue-line block h-10 w-px bg-gradient-to-b from-cream/60 to-transparent" />
      </div>
    </section>
  );
};
