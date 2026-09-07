import { CampaignStill } from "./campaign-still";
import { LandingAppButton } from "./landing-app-button";

export function ClosingCta() {
  return (
    <section className="relative isolate overflow-hidden px-5 py-8 sm:px-8">
      <div className="relative mx-auto min-h-[28rem] max-w-6xl overflow-hidden rounded-2xl">
        <CampaignStill
          name="portalRocks"
          className="absolute inset-0 size-full object-cover"
          objectPosition="center 55%"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/55 to-canvas/25" />
        <div className="relative z-10 flex min-h-[28rem] flex-col items-start justify-end px-6 py-12 sm:px-12 sm:py-16">
          <h2 className="font-display max-w-xl text-[clamp(2rem,4vw,3.4rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance text-ink">
            Give your next save a home.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-pretty text-ink/90">
            Start free with 20 bookmarks. When the library grows, Pro is $5 per
            month, billed annually.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <LandingAppButton className="w-full sm:w-auto" signedOutChildren="Start free" />
            <a
              href="#pricing"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-ink/25 px-5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-ink/10 sm:w-auto"
            >
              Compare plans
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
