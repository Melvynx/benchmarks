import { ArrowRightIcon } from "lucide-react";

import { images } from "../lib/images";
import { CampaignPicture } from "./campaign-image";
import { LandingAppButton } from "./landing-app-button";

export const ClosingCta = () => {
  return (
    <section
      className="relative isolate overflow-hidden"
      aria-labelledby="closing-title"
    >
      <CampaignPicture
        image={images.home}
        className="absolute inset-0 -z-20"
        imgClassName="object-[50%_35%]"
        sizes="100vw"
        decorative
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(12_10_16)_0%,rgb(12_10_16/0.35)_30%,rgb(12_10_16/0.35)_65%,rgb(12_10_16)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_50%,transparent_30%,rgb(12_10_16/0.6)_100%)]"
      />

      <div className="mx-auto flex min-h-[80svh] max-w-6xl flex-col items-center justify-center px-5 py-28 text-center sm:px-8">
        <p
          data-reveal
          className="text-[12px] font-medium tracking-[0.14em] text-blush uppercase"
        >
          Your home for bookmarks
        </p>
        <h2
          id="closing-title"
          data-reveal
          style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
          className="font-display mt-5 max-w-4xl text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] tracking-[-0.03em] text-cream [text-shadow:0_2px_40px_rgb(12_10_16/0.6)]"
        >
          Everything you saved,
          <br />
          <em className="text-ember-gradient not-italic">waiting for you at home.</em>
        </h2>
        <p
          data-reveal
          style={{ "--reveal-delay": "160ms" } as React.CSSProperties}
          className="mt-6 max-w-xl text-[17px] leading-relaxed text-sand sm:text-lg"
        >
          Stop keeping tabs open just in case. Save it once and let the agent
          keep the lights on.
        </p>
        <div
          data-reveal
          style={{ "--reveal-delay": "240ms" } as React.CSSProperties}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <LandingAppButton size="lg" variant="ember">
            Start saving free
            <ArrowRightIcon className="size-4" />
          </LandingAppButton>
          <a
            href="#pricing"
            className="inline-flex h-12 items-center rounded-full border border-white/20 bg-ink/40 px-6 text-[15px] font-medium text-cream backdrop-blur-md transition-colors hover:border-white/40 hover:bg-ink/60 sm:h-13 sm:px-7"
          >
            Compare plans
          </a>
        </div>
      </div>
    </section>
  );
};
