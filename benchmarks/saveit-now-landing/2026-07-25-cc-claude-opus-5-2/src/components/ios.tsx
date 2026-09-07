import { CheckIcon, PlusIcon, ShareIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { FRAMES } from "../lib/campaign";
import { cx } from "../lib/cx";
import { LINKS } from "../lib/links";
import { useInView, usePrefersReducedMotion } from "../lib/motion";
import { CampaignImage } from "./campaign-image";
import { Container, CTA, Eyebrow, Reveal } from "./ui";

const POINTS = [
  {
    title: "Save from any app",
    body: "The share sheet is always there. If you can share it, you can keep it, without leaving what you were doing.",
  },
  {
    title: "Your whole library, in your pocket",
    body: "Everything you have ever saved, searchable by meaning, from the queue or the sofa.",
  },
  {
    title: "Immediate and native",
    body: "Built for iPhone, so it opens straight away and behaves the way the rest of the system does.",
  },
];

/**
 * A stylised depiction of the iOS share gesture.
 *
 * Deliberately not a screenshot of the app. The handset shows the campaign
 * frame, and the sheet is an illustration of the system share flow, so the
 * mobile story is told without inventing product UI that does not exist here.
 */
function ShareGesture() {
  const [saved, setSaved] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>(0.45);
  const reduced = usePrefersReducedMotion();

  // Play the tap once, so the idea lands without needing to be discovered.
  useEffect(() => {
    if (!inView || reduced || saved) return;
    const timer = window.setTimeout(() => setSaved(true), 1400);
    return () => window.clearTimeout(timer);
  }, [inView, reduced, saved]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[19rem]">
      {/* Glow, echoing the arch inside the frame. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 scale-110 rounded-[4rem] bg-ember-500/25 blur-[70px]"
      />

      <div className="rounded-[2.75rem] border border-cream/15 bg-ink-3 p-2 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.95)]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[2.25rem] bg-ink">
          <CampaignImage
            frame={FRAMES.portalArch}
            sizes="(min-width: 1024px) 304px, 80vw"
            className="absolute inset-0 h-full w-full"
          />

          {/* Generic system chrome, kept abstract. */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-4 text-[0.6875rem] font-medium text-white/90">
            <span>9:41</span>
            <span aria-hidden="true" className="flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-[2px] bg-white/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
              <span className="h-2.5 w-5 rounded-[3px] border border-white/80" />
            </span>
          </div>

          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink via-ink/70 to-transparent"
          />

          {/* Share sheet */}
          <div className="absolute inset-x-2 bottom-2 rounded-[1.6rem] border border-cream/12 bg-ink-2/92 p-4 backdrop-blur-xl">
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1 w-9 rounded-full bg-cream/25"
            />

            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-[0.7rem] bg-gradient-to-br from-ember-400 to-ember-600 font-display text-sm text-white"
              >
                S
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium text-cream">
                  SaveIt.now
                </p>
                <p className="truncate text-[0.6875rem] text-haze">
                  Add to your library
                </p>
              </div>
              <ShareIcon className="size-4 text-haze" aria-hidden="true" />
            </div>

            <button
              type="button"
              onClick={() => setSaved((value) => !value)}
              aria-live="polite"
              className={cx(
                "mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full text-[0.8125rem] font-medium transition-all duration-500",
                saved
                  ? "bg-moss/20 text-moss"
                  : "bg-cream text-ink hover:bg-white",
              )}
            >
              {saved ? (
                <>
                  <CheckIcon className="size-4" aria-hidden="true" />
                  Saved
                </>
              ) : (
                <>
                  <PlusIcon className="size-4" aria-hidden="true" />
                  Save it
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-haze">
              {saved
                ? "Captured, read, and filed for you."
                : "One tap, then carry on scrolling."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IOS() {
  return (
    <section
      id="ios"
      aria-labelledby="ios-heading"
      className="relative overflow-hidden border-y border-line/70 bg-ink-2/40 py-24 sm:py-32 lg:py-40"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-1/4 top-0 h-full w-3/4 opacity-[0.14] blur-2xl"
      >
        <CampaignImage
          frame={FRAMES.portalArch}
          sizes="60vw"
          className="h-full w-full"
        />
      </div>

      <Container className="relative">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_auto] lg:gap-24">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>SaveIt.now for iOS</Eyebrow>
            </Reveal>

            <Reveal delay={60}>
              <h2
                id="ios-heading"
                className="mt-7 text-balance font-display display-tight text-[clamp(2.5rem,6vw,4.25rem)] text-cream"
              >
                Save it before
                <br />
                <em className="not-italic text-ember-gradient">
                  the moment passes.
                </em>
              </h2>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-7 text-pretty leading-relaxed text-mist">
                Most of what you want to keep turns up on your phone. In a feed,
                in a message, in a video you are half watching. Open the share
                sheet, tap SaveIt.now, and keep scrolling. The rest happens
                without you.
              </p>
            </Reveal>

            <ul className="mt-10 space-y-7">
              {POINTS.map((point, index) => (
                <Reveal as="li" key={point.title} delay={index * 90}>
                  <div className="border-l border-line pl-5">
                    <h3 className="text-[1rem] font-medium text-cream">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 text-[0.875rem] leading-relaxed text-mist">
                      {point.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={140}>
              <div className="mt-10 flex flex-wrap gap-3">
                <CTA href={LINKS.ios}>See the iOS app</CTA>
                <CTA href={LINKS.signUp} variant="ghost">
                  Start saving free
                </CTA>
              </div>
            </Reveal>
          </div>

          <Reveal variant="scale" delay={100} className="lg:pl-8">
            <figure>
              <ShareGesture />
              <figcaption className="mt-6 text-center text-[0.75rem] text-haze">
                Illustration of the iOS share flow.
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
