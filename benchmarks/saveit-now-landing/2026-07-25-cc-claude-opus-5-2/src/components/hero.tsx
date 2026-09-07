import { ArrowRightIcon } from "lucide-react";
import type { CSSProperties } from "react";

import { FRAMES } from "../lib/campaign";
import { LINKS } from "../lib/links";
import { useParallax } from "../lib/motion";
import { CampaignImage } from "./campaign-image";
import { CTA, Eyebrow } from "./ui";

/** Stagger helper. The shared observer flips these on right after mount, so
 *  the hero plays its entrance rather than waiting for a scroll. */
const at = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

/**
 * Hero built on `home.png`: a lit house at the top of a path under an enormous
 * empty dusk sky. It is the literal picture of "your home for bookmarks", and
 * that empty sky is what lets the campaign lockup sit over the art without a
 * heavy scrim fighting it.
 */
export function Hero() {
  const parallaxRef = useParallax<HTMLDivElement>(0.12);

  return (
    <section
      id="top"
      className="relative flex min-h-[92svh] items-center overflow-hidden pt-28 pb-28 sm:min-h-[100svh] sm:pt-32"
    >
      {/* Oversized so parallax never drags an edge into view. */}
      <div ref={parallaxRef} className="absolute inset-x-0 -top-[8%] h-[116%]">
        <CampaignImage
          frame={FRAMES.home}
          priority
          drift
          sizes="100vw"
          className="h-full w-full"
        />
      </div>

      {/* Grade: hold the centre open, drop the corners, and fade the base into
          the page so the hero and the next section meet without a seam. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(120%_78%_at_50%_16%,transparent_0%,rgba(10,7,16,0.32)_54%,rgba(10,7,16,0.86)_100%)]"
      />
      {/* The lit house lands behind the copy band. This soft ellipse sits only
          over that band so the support text keeps its contrast while the glow
          still reads around it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(78%_46%_at_50%_63%,rgba(10,7,16,0.74)_0%,rgba(10,7,16,0.5)_58%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/75 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 text-center sm:px-8">
        <div data-reveal="fade" style={at(120)} className="flex justify-center">
          <Eyebrow>Your home for bookmarks</Eyebrow>
        </div>

        {/* Primary visible title. */}
        <h1
          data-reveal
          style={at(220)}
          className="mt-7 font-display display-tight text-[clamp(4.25rem,15vw,11.5rem)] text-cream [text-shadow:0_0_70px_rgba(255,180,120,0.38),0_2px_30px_rgba(10,7,16,0.55)]"
        >
          Opus 5
        </h1>

        <div
          data-reveal="fade"
          style={at(360)}
          className="mx-auto mt-8 h-px w-full max-w-md bg-gradient-to-r from-transparent via-ember-300/70 to-transparent sm:mt-9"
        />

        {/* Conversion headline. */}
        <p
          data-reveal
          style={at(440)}
          className="mx-auto mt-8 max-w-3xl text-balance text-[clamp(1.65rem,4.4vw,2.9rem)] font-medium leading-[1.12] tracking-tight text-cream [text-shadow:0_2px_28px_rgba(10,7,16,0.75)] sm:mt-9"
        >
          Save it once.{" "}
          <span className="text-ember-gradient">Find it forever.</span>
        </p>

        <p
          data-reveal
          style={at(540)}
          className="mx-auto mt-6 max-w-xl text-pretty text-[0.9375rem] leading-relaxed text-mist sm:text-base"
        >
          Save any link, video, or image in one tap. SaveIt.now captures the
          whole thing, works out what it is about, and files it for you. When
          you want it back, ask in your own words.
        </p>

        <div
          data-reveal
          style={at(640)}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <CTA href={LINKS.signUp} size="lg" className="w-full sm:w-auto">
            Start saving free
            <ArrowRightIcon
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </CTA>
          <CTA
            href="#workflow"
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto"
          >
            See how it works
          </CTA>
        </div>

        <p data-reveal="fade" style={at(740)} className="mt-6 text-[0.8125rem] text-haze">
          Free to start. No credit card.
        </p>
      </div>
    </section>
  );
}
