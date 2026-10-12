import { CampaignStill } from "./campaign-still";
import { CtaLink } from "./cta-link";

export function Hero() {
  return (
    <section
      id="top"
      className="section-anchor lg:grid lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
    >
      <div className="order-2 flex flex-col justify-center px-5 py-14 sm:px-8 lg:order-1 lg:px-12 lg:py-16 xl:px-16">
        <div className="max-w-xl">
          <h1
            className="rise font-display text-[clamp(2.75rem,4.8vw,6rem)] font-semibold leading-[0.96] tracking-[-0.03em] text-ivory"
            style={{ animationDelay: "40ms" }}
          >
            Grok 4.7
          </h1>
          <h2
            className="rise mt-4 font-display text-[clamp(2rem,3.2vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-coral"
            style={{ animationDelay: "120ms" }}
          >
            Just save it.
          </h2>
          <p
            className="rise mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            SaveIt.now is your home for bookmarks. You save a page, a video, an
            image, a PDF, or a post. SaveIt captures it, reads it, and files
            it, so you can ask for it again instead of hunting through folders
            and tabs.
          </p>
          <div
            className="rise mt-8 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "280ms" }}
          >
            <CtaLink href="#pricing">Start free</CtaLink>
            <CtaLink href="#workflow" tone="secondary">
              See how saving works
            </CtaLink>
          </div>
        </div>
      </div>

      <figure className="relative order-1 min-h-[72vw] sm:min-h-[56vw] lg:order-2 lg:min-h-full">
        <CampaignStill
          name="observatory"
          priority
          sizes="(min-width: 1024px) 56vw, 100vw"
          alt="A person in white stands in a flower meadow, facing a white hilltop observatory crowned by a glowing arc."
          className="hero-still absolute inset-0 h-full w-full object-cover object-[center_68%]"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-ink px-5 py-3 text-sm leading-snug text-muted sm:px-6">
          The arc over the observatory is the way back to what you saved.
        </figcaption>
      </figure>
    </section>
  );
}
