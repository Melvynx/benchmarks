import { campaign } from "../lib/campaign-images";
import { SIGN_UP_URL } from "../lib/site";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { useScrollY } from "../lib/use-scroll";
import { CampaignPicture } from "./ui/campaign-picture";
import { Cta, CtaArrow } from "./ui/cta";

/**
 * Full frame opening on `portal-ridge`: a path climbing a ridge to a standing
 * door of light. The art is treated as a campaign plate, with the type set as
 * a title card over the sky and the horizon left clear.
 */
export function Hero() {
  const reduced = useReducedMotion();
  const scrollY = useScrollY(!reduced);

  // Art drifts slower than the page, type drifts faster and fades away.
  const plateShift = Math.min(scrollY * 0.3, 260);
  const typeShift = Math.min(scrollY * 0.16, 140);
  const typeFade = Math.max(0, 1 - scrollY / 520);

  return (
    <section
      id="top"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden pb-14 pt-28 sm:pb-20"
    >
      {/* Campaign plate */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="grain absolute inset-0 will-change-transform"
          style={{
            transform: `translate3d(0, ${plateShift}px, 0) scale(1.14)`,
            transformOrigin: "center 35%",
          }}
        >
          <CampaignPicture
            image={campaign.ridge}
            priority
            sizes="100vw"
            className="h-full w-full"
            imgClassName="object-[50%_42%]"
          />
        </div>

        {/* The doorway breathes, so the still frame reads as a live place. */}
        <div
          aria-hidden="true"
          className="portal-pulse absolute left-1/2 top-[52%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-64 sm:w-64"
          style={{
            background:
              "radial-gradient(circle, rgba(255,244,234,0.42) 0%, rgba(255,138,76,0.18) 45%, transparent 72%)",
          }}
        />

        {/* Scrims. The weight sits on the left, under the type, so the right
            half of the plate keeps the coral light and the doorway intact. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-r from-ink/92 via-ink/45 via-40% to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-ink/70 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-ink via-ink/55 via-45% to-transparent"
        />
      </div>

      <div
        className="mx-auto w-full max-w-[88rem] px-5 sm:px-8"
        style={
          reduced
            ? undefined
            : {
                transform: `translate3d(0, -${typeShift}px, 0)`,
                opacity: typeFade,
              }
        }
      >
        <div className="max-w-4xl">
          <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1 text-lilac/85">
            <span>SaveIt.now</span>
            <span aria-hidden="true" className="h-px w-6 bg-lilac/40" />
            <span className="text-cream/70">Your home for bookmarks</span>
          </p>

          {/* Primary visible title */}
          <h1 className="display-xl mt-5 text-gradient-ember">Opus 5</h1>

          <p className="display-lg mt-4 max-w-2xl text-glow sm:mt-6">
            Save it once.
            <br className="hidden sm:block" />{" "}
            <em className="italic">Find it forever.</em>
          </p>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
            One tap saves a link, a video, a PDF or a post. SaveIt reads it,
            understands it, and files it for you. When you want it back, ask in
            your own words.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta href={SIGN_UP_URL} size="lg">
              Start free
              <CtaArrow />
            </Cta>
            <Cta href="#how" variant="ghost" size="lg">
              See how it works
            </Cta>
          </div>

          <p className="mt-5 text-[13px] text-muted">
            Free plan, no card needed. Pro is $5 a month billed annually.
          </p>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-5 right-5 hidden items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-muted/70 lg:flex"
        style={reduced ? undefined : { opacity: typeFade }}
      >
        <span>Scroll</span>
        <span className="block h-10 w-px bg-linear-to-b from-lilac/50 to-transparent" />
      </div>
    </section>
  );
}
