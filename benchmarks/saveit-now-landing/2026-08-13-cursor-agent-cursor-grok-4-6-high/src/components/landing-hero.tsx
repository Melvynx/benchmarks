import { CampaignStill } from "./campaign-still";
import { LandingAppButton } from "./landing-app-button";

export function LandingHero() {
  return (
    <section id="top" className="relative min-h-svh overflow-hidden">
      <div className="absolute inset-0">
        <CampaignStill
          name="home"
          priority
          className="hero-still size-full object-cover"
          objectPosition="center 42%"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-canvas/35 via-canvas/10 to-canvas" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-canvas via-canvas/80 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 sm:pb-20 lg:pb-24">
        <p className="text-sm font-medium tracking-wide text-ember">
          Your home for bookmarks
        </p>
        <h1 className="font-display mt-4 max-w-4xl text-[clamp(2.6rem,8vw,5.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em] text-balance text-ink">
          Cursor Grok 4.6
        </h1>
        <p className="font-display mt-5 max-w-xl text-[clamp(1.6rem,4vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">
          Just save it.
        </p>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-pretty text-mute sm:text-lg">
          You save a link. SaveIt captures the page, understands it, files it,
          and brings it back when you ask. No folders to maintain.
        </p>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <LandingAppButton className="w-full sm:w-auto" signedOutChildren="Start free" />
          <a
            href="#workflow"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-ink/20 px-5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-ink/10 sm:w-auto"
          >
            See how saving works
          </a>
        </div>
      </div>
    </section>
  );
}
