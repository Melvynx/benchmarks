import { CheckIcon, XIcon } from "lucide-react";

import { FRAMES } from "../lib/campaign";
import { CampaignImage } from "./campaign-image";
import { Container, Eyebrow, Reveal } from "./ui";

const BEFORE = [
  "A bookmarks bar you stopped opening months ago.",
  "Tabs kept alive because closing one means losing it.",
  "Folders that made sense the day you made them.",
  "You know you saved it. You cannot find it.",
];

const AFTER = [
  "One action, then it leaves your head entirely.",
  "Every save read and understood on arrival.",
  "No folder to pick, no tag to invent, no cleanup.",
  "Half a memory and a few words is enough to get it back.",
];

/**
 * The transformation, sold before any feature list.
 *
 * Uses `observatory.png`: a lone figure in a meadow under a hilltop
 * observatory. It gives the section human scale and reads as a system quietly
 * keeping watch over everything below it, which is the argument being made.
 */
export function Transformation() {
  return (
    // overflow-x-clip contains the full-bleed band's scale reveal, which is
    // 4% wider than the viewport until it settles. `clip` rather than `hidden`
    // so no scroll container is created on either axis.
    <section
      aria-labelledby="shift-heading"
      className="relative overflow-x-clip py-24 sm:py-32 lg:py-40"
    >
      <Container>
        <Reveal>
          <Eyebrow tone="dusk">The shift</Eyebrow>
        </Reveal>

        <div className="mt-7 grid gap-x-16 gap-y-6 lg:grid-cols-[1.15fr_1fr] lg:items-end">
          <Reveal delay={60}>
            <h2
              id="shift-heading"
              className="max-w-2xl text-balance font-display display-tight text-[clamp(2.5rem,6.2vw,4.5rem)] text-cream"
            >
              You stop filing.
              <br />
              <em className="text-ember-gradient not-italic">
                It starts working.
              </em>
            </h2>
          </Reveal>

          <Reveal delay={140}>
            <p className="max-w-md text-pretty leading-relaxed text-mist">
              Bookmarking has always asked you to predict the future: name it,
              file it, and hope you remember where. SaveIt.now takes the whole
              job. You save. It reads, sorts, and remembers on your behalf.
            </p>
          </Reveal>
        </div>
      </Container>

      {/* Cinematic band. Full bleed on purpose: this is the campaign moment of
          the section, and the crop keeps the figure and the arc in frame. */}
      <Reveal variant="scale" delay={100} className="mt-16 sm:mt-20">
        <figure className="relative">
          <CampaignImage
            frame={FRAMES.observatory}
            drift
            sizes="100vw"
            className="h-[52svh] min-h-[320px] w-full sm:h-[64svh] lg:h-[76svh]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,7,16,0.92)_0%,rgba(10,7,16,0.25)_38%,transparent_65%)]"
            />
            {/* Blend the band into the page above and below it. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink to-transparent"
            />
          </CampaignImage>

          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0">
            <Container className="pb-8 sm:pb-12">
              <p className="max-w-xl text-balance font-display text-[clamp(1.35rem,3vw,2.1rem)] leading-snug text-cream [text-shadow:0_2px_24px_rgba(10,7,16,0.8)]">
                Everything you kept, held in one place, watching over itself.
              </p>
            </Container>
          </figcaption>
        </figure>
      </Reveal>

      <Container className="mt-16 sm:mt-20">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* The pain, deliberately desaturated. */}
          <Reveal>
            <div className="h-full rounded-2xl border border-line bg-ink-2/70 p-7 sm:p-9">
              <h3 className="text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-haze">
                How it goes today
              </h3>
              <ul className="mt-6 space-y-4">
                {BEFORE.map((line) => (
                  <li key={line} className="flex gap-3.5 text-[0.9375rem] leading-relaxed text-haze">
                    <XIcon
                      className="mt-1 size-4 shrink-0 text-haze/60"
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* The gain, lit. */}
          <Reveal delay={110}>
            <div className="relative h-full overflow-hidden rounded-2xl border border-ember-500/25 bg-gradient-to-b from-ember-600/[0.13] to-ink-2/70 p-7 sm:p-9">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ember-500/20 blur-3xl"
              />
              <h3 className="relative text-[0.8125rem] font-medium uppercase tracking-[0.16em] text-ember-300">
                How it goes with SaveIt.now
              </h3>
              <ul className="relative mt-6 space-y-4">
                {AFTER.map((line) => (
                  <li key={line} className="flex gap-3.5 text-[0.9375rem] leading-relaxed text-cream">
                    <CheckIcon
                      className="mt-1 size-4 shrink-0 text-ember-400"
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
