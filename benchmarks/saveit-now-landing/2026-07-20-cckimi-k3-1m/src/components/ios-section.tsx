import {
  AppleIcon,
  BookmarkCheckIcon,
  FolderSyncIcon,
  SearchIcon,
  ShareIcon,
  SparklesIcon,
} from "lucide-react";
import { Reveal } from "./reveal";

const FEATURES = [
  {
    icon: ShareIcon,
    title: "Share sheet saving",
    body: "Two taps from Safari, YouTube, or any app. Never a form to fill in.",
  },
  {
    icon: SearchIcon,
    title: "Agent search in your pocket",
    body: "Ask in plain words and the exact link comes back, wherever you are.",
  },
  {
    icon: FolderSyncIcon,
    title: "One library everywhere",
    body: "Saves from your phone, browser, and desktop live in the same home.",
  },
];

export const IosSection = () => {
  return (
    <section
      id="ios"
      className="scroll-mt-20 overflow-hidden px-5 py-24 sm:px-8 lg:py-36"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* Copy */}
        <div>
          <Reveal>
            <p className="kicker text-ember">03 · The iOS app</p>
            <h2 className="mt-6 text-balance font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Save from <em className="display-italic text-flare">anywhere</em>{" "}
              on iPhone.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-dusk">
              The share sheet is always two taps away. Send a page to SaveIt and
              your agent has it read and filed before the phone is back in your
              pocket. Native, immediate, at home on iOS.
            </p>
          </Reveal>

          <ul className="mt-10 space-y-6">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 100}>
                <li className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-ember/25 bg-ember/10 text-flare">
                    <feature.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-haze">
                      {feature.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={200}>
            <div className="mt-10">
              <a
                href="/ios"
                className="inline-flex h-12 items-center gap-3 rounded-full bg-ink px-7 text-sm font-semibold text-coal transition-all duration-300 hover:bg-flare"
              >
                <AppleIcon className="size-5 fill-current" />
                <span className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                    Download on the
                  </span>
                  <span className="mt-1 text-sm font-semibold">App Store</span>
                </span>
              </a>
            </div>
          </Reveal>
        </div>

        {/* Device with campaign artwork */}
        <Reveal delay={150}>
          <div className="relative mx-auto w-fit px-6 sm:px-10">
            {/* Floating annotations */}
            <div
              className="animate-float absolute -left-2 top-16 z-20 hidden items-center gap-2.5 rounded-full border border-white/10 bg-coal/90 py-2 pl-3 pr-4 shadow-xl shadow-black/40 backdrop-blur-md sm:flex"
              aria-hidden="true"
            >
              <BookmarkCheckIcon className="size-4 text-flare" />
              <span className="text-[12px] font-medium text-ink">
                Saved from Safari · just now
              </span>
            </div>
            <div
              className="animate-float absolute -right-2 bottom-24 z-20 hidden items-center gap-2.5 rounded-full border border-white/10 bg-coal/90 py-2 pl-3 pr-4 shadow-xl shadow-black/40 backdrop-blur-md sm:flex [animation-delay:1.2s]"
              aria-hidden="true"
            >
              <SparklesIcon className="size-4 text-flare" />
              <span className="text-[12px] font-medium text-ink">
                Filed by your agent · Reading
              </span>
            </div>

            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[min(26rem,80vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/15 blur-[120px]"
              aria-hidden="true"
            />

            <figure className="relative w-[280px] sm:w-[320px]">
              <div className="overflow-hidden rounded-[3rem] border border-white/[0.12] bg-coal-deep p-2 shadow-2xl shadow-black/60">
                <div className="relative overflow-hidden rounded-[2.5rem]">
                  <img
                    src="/images/landing-v2/portal-rocks.png"
                    alt="SaveIt campaign artwork of a glowing doorway between mossy boulders, shown inside a phone frame"
                    className="aspect-[9/19] w-full object-cover"
                    loading="lazy"
                  />
                  {/* Dynamic island */}
                  <div
                    className="absolute left-1/2 top-2.5 h-7 w-28 -translate-x-1/2 rounded-full bg-coal-deep"
                    aria-hidden="true"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coal/60 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                    <p className="font-display text-lg italic text-ink">
                      Save it. Keep it. Find it.
                    </p>
                  </div>
                </div>
              </div>
              <figcaption className="mt-5 text-center text-[12px] tracking-wide text-haze">
                Campaign artwork. The app itself is on the App Store.
              </figcaption>
            </figure>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
