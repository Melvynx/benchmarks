import { ArrowRightIcon } from "lucide-react";

import { FRAMES } from "../lib/campaign";
import { LINKS } from "../lib/links";
import { useParallax } from "../lib/motion";
import { CampaignImage } from "./campaign-image";
import { Container, CTA, Eyebrow, Reveal } from "./ui";

/**
 * Closing frame: `lake.png`, the only image of the six with a reflection.
 * Everything above the waterline comes back below it, which is the argument
 * the whole page has been making. Calm and resolved, the right note to end on.
 */
export function ClosingCTA() {
  const parallaxRef = useParallax<HTMLDivElement>(0.08);

  return (
    <section
      aria-labelledby="closing-heading"
      className="relative flex min-h-[80svh] items-center overflow-hidden py-28 sm:py-36"
    >
      <div ref={parallaxRef} className="absolute inset-x-0 -top-[6%] h-[112%]">
        <CampaignImage
          frame={FRAMES.lake}
          drift
          sizes="100vw"
          className="h-full w-full"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(110%_75%_at_50%_45%,rgba(10,7,16,0.62)_0%,rgba(10,7,16,0.82)_60%,rgba(10,7,16,0.96)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent"
      />

      <Container className="relative text-center">
        <Reveal>
          <Eyebrow>Start now</Eyebrow>
        </Reveal>

        <Reveal delay={80}>
          <h2
            id="closing-heading"
            className="mx-auto mt-8 max-w-4xl text-balance font-display display-tight text-[clamp(2.75rem,8vw,6rem)] text-cream [text-shadow:0_2px_40px_rgba(10,7,16,0.7)]"
          >
            Your home for bookmarks
            <br />
            <em className="not-italic text-ember-gradient">is one tap away.</em>
          </h2>
        </Reveal>

        <Reveal delay={150}>
          <p className="mx-auto mt-8 max-w-xl text-pretty leading-relaxed text-mist">
            Start with the next link you were about to leave open in a tab. Save
            it, close the tab, and let it come back to you when it matters.
          </p>
        </Reveal>

        <Reveal delay={220}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTA href={LINKS.signUp} size="lg" className="w-full sm:w-auto">
              Start saving free
              <ArrowRightIcon
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </CTA>
            <CTA
              href="#pricing"
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto"
            >
              See pricing
            </CTA>
          </div>
        </Reveal>

        <Reveal variant="fade" delay={300}>
          <p className="mt-6 text-[0.8125rem] text-haze">
            Free to start. No credit card.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
