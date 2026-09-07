import { ArchiveIcon, ScanSearchIcon, SparklesIcon } from "lucide-react";
import type { ComponentType } from "react";

import { FRAMES, frameUrl, jpegFallback } from "../lib/campaign";
import { useCountUp, useInView } from "../lib/motion";
import { CampaignImage } from "./campaign-image";
import { Container, Eyebrow, Reveal } from "./ui";

const PILLARS: Array<{
  title: string;
  body: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  {
    title: "Saved in full",
    body: "Content and screenshot are kept, so a save survives the page changing or going away.",
    Icon: ArchiveIcon,
  },
  {
    title: "Understood on arrival",
    body: "Every item is read, summarised, and typed the moment it lands. Nothing waits in a queue for you.",
    Icon: SparklesIcon,
  },
  {
    title: "Found by meaning",
    body: "Search matches the idea, not the spelling, so vague beats exact and you still get there.",
    Icon: ScanSearchIcon,
  },
];

/**
 * The 100% promise.
 *
 * Uses `portal-ridge.png`, the most cinematic of the six: a lit portal on a
 * ridge with a stone path leading back to it. The frame is clipped inside the
 * numerals so the figure itself becomes the portal, which is the idea the
 * section is arguing. The same frame sits behind at low opacity to hold the
 * room together.
 */
export function Promise() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const count = useCountUp(100, inView);
  const frame = FRAMES.portalRidge;

  return (
    <section
      id="promise"
      aria-labelledby="promise-heading"
      className="relative overflow-hidden py-28 sm:py-36 lg:py-44"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <CampaignImage
          frame={frame}
          drift
          sizes="100vw"
          className="h-full w-full opacity-45"
        />
        {/* Hold the middle dark enough for text, keep the edges cinematic. */}
        <div className="absolute inset-0 bg-[radial-gradient(100%_70%_at_50%_50%,rgba(10,7,16,0.86)_0%,rgba(10,7,16,0.7)_55%,rgba(10,7,16,0.94)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <Container className="relative">
        <div ref={ref} className="flex flex-col items-center text-center">
          <Reveal>
            <Eyebrow>The 100% promise</Eyebrow>
          </Reveal>

          {/* The numerals are a window onto the ridge. */}
          <Reveal variant="scale" delay={80}>
            <div className="relative mt-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 mx-auto h-full w-3/4 rounded-full bg-ember-500/25 blur-[100px]"
              />
              <p
                className="text-image-fill font-display display-tight text-[clamp(6.5rem,26vw,20rem)]"
                style={{
                  backgroundImage: `image-set(url("${frameUrl(frame, 1600)}") type("image/webp"), url("${jpegFallback(frame)}") type("image/jpeg"))`,
                  backgroundSize: "cover",
                  backgroundPosition: "center 44%",
                }}
              >
                <span aria-hidden="true">{count}%</span>
                <span className="sr-only">100 percent</span>
              </p>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <h2
              id="promise-heading"
              className="mx-auto mt-4 max-w-4xl text-balance font-display text-[clamp(1.8rem,4.6vw,3.4rem)] leading-[1.1] text-cream"
            >
              of what you save is meant to be found again.
            </h2>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto mt-8 max-w-2xl text-pretty leading-relaxed text-mist">
              That is the standard this product is built to. Not a folder you
              hope to remember. Not a tab you meant to read. Every save is kept
              whole, understood the moment it lands, and indexed by meaning, so
              future you gets it back with a half memory and a few words.
            </p>
          </Reveal>
        </div>

        <ul className="mx-auto mt-20 grid max-w-5xl gap-4 sm:gap-5 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Reveal as="li" key={pillar.title} delay={index * 100}>
              <div className="h-full rounded-2xl border border-cream/10 bg-ink/60 p-7 backdrop-blur-md transition-colors duration-500 hover:border-ember-500/30">
                <pillar.Icon
                  className="size-[18px] text-ember-400"
                  aria-hidden={true}
                />
                <h3 className="mt-5 text-[1.0625rem] font-medium text-cream">
                  {pillar.title}
                </h3>
                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-mist">
                  {pillar.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
