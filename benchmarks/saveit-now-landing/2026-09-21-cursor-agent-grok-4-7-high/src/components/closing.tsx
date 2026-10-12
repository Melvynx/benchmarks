import { CampaignStill } from "./campaign-still";
import { CtaLink } from "./cta-link";

export function Closing() {
  return (
    <section aria-labelledby="close-heading">
      <CampaignStill
        name="observatory"
        sizes="100vw"
        alt="The glowing arc above a white observatory, seen across a flowered hill at dusk."
        className="h-[min(62vh,680px)] min-h-72 w-full object-cover object-[center_42%]"
      />
      <div className="px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <h2
            id="close-heading"
            className="text-balance font-display text-[clamp(2.15rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em]"
          >
            Come back for what you saved.
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            Start with 20 bookmarks, free. When that home is too small, Pro is
            $5 a month, billed once a year at $60.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaLink href="#pricing">Start free</CtaLink>
            <CtaLink href="#promise" tone="secondary">
              Read the promise
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
