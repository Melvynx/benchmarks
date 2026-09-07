import { useEffect, useId, useState } from "react";

import { campaign } from "../lib/campaign-images";
import { useInView } from "../lib/use-in-view";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { CampaignPicture } from "./ui/campaign-picture";
import { Reveal } from "./ui/reveal";
import { SectionLabel } from "./ui/section-label";

const STEP_MS = 5200;

const STEPS = [
  {
    key: "capture",
    title: "Capture",
    lead: "You tap once.",
    body: "Save from the browser, from the iOS share sheet, or with a right click on an image. That is the whole of your job, and it is the last decision you have to make.",
  },
  {
    key: "understand",
    title: "Understand",
    lead: "It reads what you saved.",
    body: "SaveIt opens the page, reads the article, takes in the video, parses the PDF. It works out what the thing actually is instead of storing a bare address.",
  },
  {
    key: "organize",
    title: "Organize",
    lead: "It files itself.",
    body: "Title, summary, type and tags are written for you. Your library keeps its own shape as it grows, so no backlog is ever waiting to be sorted.",
  },
  {
    key: "return",
    title: "Return",
    lead: "You ask, in your words.",
    body: "Describe what it was about and it comes back, even when you never knew its title. Meaning is the index, so half a memory is enough to find it.",
  },
] as const;

/**
 * The agentic mechanism, told as four beats. The list advances on its own
 * while it is on screen, yields to any pointer or keyboard focus, and does not
 * autoplay at all when the visitor prefers reduced motion.
 */
export function AgenticFlow() {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.25,
    once: false,
  });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const baseId = useId();

  const autoplay = !reduced && inView && !paused;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % STEPS.length),
      STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, [autoplay]);

  return (
    <section id="how" className="relative py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        {/* Heading beside the observatory: one person below, the work going on
            above them without being asked. */}
        <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-6">
            <SectionLabel index="02">The mechanism</SectionLabel>
            <h2 className="display-lg mt-6 text-glow">
              You save it.
              <br />
              <em className="italic text-gradient-ember">
                The agent does the rest.
              </em>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">
              Agentic bookmarking means the filing happens without you. No
              folder to pick at save time, no cleanup later. You keep the one
              action worth keeping, and the library assembles itself around it.
            </p>
          </Reveal>

          <Reveal variant="blur" delay={100} className="lg:col-span-6">
            <figure className="grain relative overflow-hidden rounded-2xl border border-lilac/12">
              <CampaignPicture
                image={campaign.observatory}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="aspect-16/10 w-full"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/10 to-transparent"
              />
              <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="font-display text-xl text-glow sm:text-2xl">
                  You stand in the field. The work happens above you.
                </p>
              </figcaption>
            </figure>
          </Reveal>
        </div>

        {/* Stepper */}
        <div
          ref={ref}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-lilac/12 bg-lilac/10 sm:mt-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
        >
          <ul className="flex min-w-0 flex-col bg-ink-2/85">
            {STEPS.map((step, index) => {
              const isActive = index === active;
              const buttonId = `${baseId}-step-${step.key}`;
              const panelId = `${baseId}-detail-${step.key}`;

              return (
                <li
                  key={step.key}
                  className="relative border-b border-lilac/10 last:border-b-0"
                >
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isActive}
                    aria-controls={panelId}
                    onClick={() => setActive(index)}
                    className={`flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 px-6 pb-2 pt-6 text-left transition-colors duration-300 sm:px-9 sm:pt-7 ${
                      isActive ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] tabular-nums transition-colors ${
                        isActive ? "text-amber" : "text-faint"
                      }`}
                    >
                      0{index + 1}
                    </span>
                    <span
                      className={`font-display text-2xl transition-colors sm:text-[1.75rem] ${
                        isActive ? "text-glow" : "text-muted"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span
                      className={`text-[13px] transition-colors ${
                        isActive ? "text-cream/70" : "text-faint"
                      }`}
                    >
                      {step.lead}
                    </span>
                  </button>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`accordion-body px-6 sm:px-9 ${
                      isActive ? "bg-white/[0.03]" : ""
                    }`}
                    data-open={isActive}
                  >
                    <div>
                      <p className="max-w-md pb-6 text-[15px] leading-relaxed text-muted sm:pb-7">
                        {step.body}
                      </p>
                    </div>
                  </div>

                  {/* Elapsed time on the active step, so the autoplay reads as
                      deliberate rather than surprising. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 block h-px overflow-hidden"
                  >
                    <span
                      key={`${active}-${autoplay}`}
                      className={`block h-full origin-left bg-linear-to-r from-ember to-amber ${
                        isActive ? "" : "hidden"
                      } ${autoplay ? "progress-fill" : ""}`}
                      style={{ ["--step-duration" as string]: `${STEP_MS}ms` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>

          <StageDiagram active={active} />
        </div>
      </div>
    </section>
  );
}

/**
 * A schematic of one bookmark moving through the four steps. It is drawn from
 * primitives on purpose: it explains the pipeline without pretending to be a
 * screenshot of the product.
 */
function StageDiagram({ active }: { active: number }) {
  const showMeta = active >= 1;
  const showFiling = active >= 2;
  const showQuery = active === 3;

  return (
    <div className="ember-wash relative flex min-w-0 flex-col justify-center gap-4 bg-ink-3/85 p-6 sm:p-10">
      <p className="eyebrow text-faint">One bookmark, four steps</p>

      {/* Captured */}
      <div className="flex items-center gap-3 rounded-xl border border-lilac/15 bg-ink/60 px-4 py-3">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-moss shadow-[0_0_10px_2px_rgba(142,200,122,0.5)]"
        />
        <span className="truncate font-mono text-[12px] text-muted">
          swequiz.com/blog/caching-fundamentals
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-moss/15 px-2 py-0.5 text-[10px] font-medium text-moss">
          Saved
        </span>
      </div>

      {/* Understood */}
      <div className="accordion-body" data-open={showMeta}>
        <div>
          <div className="rounded-xl border border-lilac/15 bg-ink/60 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber">
                Article
              </span>
              <span className="text-[11px] text-faint">6 min read</span>
            </div>
            <p className="mt-2.5 text-[15px] font-medium leading-snug text-cream">
              A Crash Course on Caching Fundamentals
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              How caches work, where they break, and the invalidation traps
              worth knowing before you ship one.
            </p>
          </div>
        </div>
      </div>

      {/* Filed */}
      <div className="accordion-body" data-open={showFiling}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {["caching", "systems design", "backend"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-lilac/20 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted"
              >
                {tag}
              </span>
            ))}
            <span className="text-[11px] text-faint">filed automatically</span>
          </div>
        </div>
      </div>

      {/* Retrieved */}
      <div className="accordion-body" data-open={showQuery}>
        <div>
          <div className="rounded-xl border border-ember/35 bg-ember/[0.08] px-4 py-3">
            <p className="eyebrow text-ember/90">Months later</p>
            <p className="mt-2 text-[14px] text-cream">
              &ldquo;that caching thing I read in the spring&rdquo;
              <span
                aria-hidden="true"
                className="caret ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-amber"
              />
            </p>
            <p className="mt-2 text-[12px] text-amber/85">
              One exact match, no title required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
