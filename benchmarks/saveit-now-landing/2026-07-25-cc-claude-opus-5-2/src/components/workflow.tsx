import { BrainIcon, DownloadIcon, LayersIcon, SearchIcon } from "lucide-react";
import type { ComponentType } from "react";

import { FRAMES } from "../lib/campaign";
import { LINKS } from "../lib/links";
import { CampaignImage } from "./campaign-image";
import { Container, CTA, Eyebrow, Reveal } from "./ui";

type Step = {
  n: string;
  title: string;
  body: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

/** What happens after you save, none of which you touch. */
const PIPELINE: Step[] = [
  {
    n: "01",
    title: "Capture",
    body: "It takes the whole thing. Page content, screenshot, video, thread, image. Not just a URL that can rot.",
    Icon: DownloadIcon,
  },
  {
    n: "02",
    title: "Understand",
    body: "It reads and watches, then writes a title and a summary of what the thing is actually about.",
    Icon: BrainIcon,
  },
  {
    n: "03",
    title: "Organize",
    body: "Type and tags are assigned on arrival. Your library sorts itself while you do something else.",
    Icon: LayersIcon,
  },
  {
    n: "04",
    title: "Return",
    body: "Ask in plain language. It matches on meaning, so the words you remember do not have to be the words on the page.",
    Icon: SearchIcon,
  },
];

/** Real recordings shipped with the product, not mockups. */
const CAPTURE_SURFACES = [
  {
    gif: "/docs/save-link.gif",
    title: "Save the page you are on",
    body: "One click in the toolbar saves an article, a video, a post, or a PDF.",
  },
  {
    gif: "/docs/save-image2.gif",
    title: "Save an image you spotted",
    body: "Right click any image and send it straight to your library.",
  },
  {
    gif: "/docs/pin-extensions.gif",
    title: "Pin it once, forget it",
    body: "Chrome and Firefox. Pin the extension and saving is always one click away.",
  },
];

/**
 * The agentic mechanism. Uses `portal-rocks.png`, the frame with a path
 * running through a lit doorway: hand a thing over on one side, get it back
 * on the other. It is the brightest of the six, which suits the section that
 * has to feel like clarity.
 */
export function Workflow() {
  return (
    <section
      id="workflow"
      aria-labelledby="workflow-heading"
      className="relative overflow-hidden py-24 sm:py-32 lg:py-40"
    >
      {/* Ambient frame, heavily knocked back and masked so it reads as light
          in the room rather than as a picture competing with the text. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <CampaignImage
          frame={FRAMES.portalRocks}
          sizes="100vw"
          className="h-full w-full opacity-[0.16]"
          imgClassName="[mask-image:radial-gradient(75%_60%_at_50%_38%,black,transparent)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink" />
      </div>

      <Container className="relative">
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>The mechanism</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h2
              id="workflow-heading"
              className="mt-7 text-balance font-display display-tight text-[clamp(2.5rem,6.2vw,4.5rem)] text-cream"
            >
              One action.
              <br />
              <em className="not-italic text-ember-gradient">
                That is the whole workflow.
              </em>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-7 max-w-xl text-pretty leading-relaxed text-mist">
              There is no second step for you. No folder to choose, no tag to
              invent, no weekend spent tidying. You save it. Four things then
              happen without you.
            </p>
          </Reveal>
        </div>

        {/* The split that makes the promise concrete: your side is one thing. */}
        <div className="mt-16 grid gap-6 lg:grid-cols-[0.85fr_2.4fr] lg:gap-10">
          <Reveal>
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-ember-500/25 bg-gradient-to-b from-ember-600/[0.16] to-ink-2/80 p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-ember-500/25 blur-3xl"
              />
              <div className="relative">
                <p className="text-[0.75rem] font-medium uppercase tracking-[0.18em] text-ember-300">
                  You do
                </p>
                <p className="mt-6 font-display text-[5.5rem] leading-none text-cream">
                  1
                </p>
                <p className="mt-3 text-lg font-medium text-cream">Save it.</p>
              </div>
              <p className="relative mt-8 text-[0.9375rem] leading-relaxed text-mist">
                That is your entire job. Everything below is the part you never
                have to think about again.
              </p>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="mb-5 text-[0.75rem] font-medium uppercase tracking-[0.18em] text-dusk-300">
                It does the rest
              </p>
            </Reveal>

            <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {PIPELINE.map((step, index) => (
                <Reveal as="li" key={step.n} delay={index * 90}>
                  <div className="group relative h-full bg-ink-2 p-7 transition-colors duration-500 hover:bg-ink-3">
                    {/* Light rises through each card on hover. */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-ember-400/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />
                    <div className="flex items-center justify-between">
                      <step.Icon
                        className="size-[18px] text-ember-400"
                        aria-hidden={true}
                      />
                      <span className="font-display text-sm text-haze">
                        {step.n}
                      </span>
                    </div>
                    <h3 className="mt-5 text-[1.0625rem] font-medium text-cream">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-[0.875rem] leading-relaxed text-mist">
                      {step.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>

        {/* Real product recordings. The one place on the page that shows the
            actual UI, which is exactly why they are not stylised. */}
        <div className="mt-24 sm:mt-32">
          <Reveal>
            <h3 className="text-balance font-display text-[clamp(1.75rem,3.6vw,2.5rem)] text-cream">
              Saving happens where you already are
            </h3>
          </Reveal>
          <Reveal delay={60}>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-mist">
              You should not have to open an app to keep something. Save from
              the page, the image, or the share sheet, and carry on.
            </p>
          </Reveal>

          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {CAPTURE_SURFACES.map((surface, index) => (
              <Reveal as="li" key={surface.title} delay={index * 90}>
                <figure className="group h-full overflow-hidden rounded-2xl border border-line bg-ink-2 transition-colors duration-500 hover:border-line-2">
                  <div className="relative aspect-video overflow-hidden bg-ink-3">
                    <img
                      src={surface.gif}
                      alt={`Screen recording: ${surface.title.toLowerCase()}`}
                      width={800}
                      height={451}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cream/[0.06]"
                    />
                  </div>
                  <figcaption className="p-6">
                    <h4 className="text-[0.9375rem] font-medium text-cream">
                      {surface.title}
                    </h4>
                    <p className="mt-2 text-[0.875rem] leading-relaxed text-mist">
                      {surface.body}
                    </p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={80}>
            <div className="mt-10">
              <CTA href={LINKS.extensions} variant="ghost">
                Get the browser extension
              </CTA>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
