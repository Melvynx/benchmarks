import { LandingAppButton } from "./landing-app-button";
import { Reveal } from "./reveal";

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden text-on-dark">
      <div className="absolute inset-0">
        <img
          src="/images/landing-v2/home.png"
          alt="A warmly lit house on a flowered hill at dusk, your home for bookmarks"
          className="size-full object-cover object-[center_40%]"
          width={3272}
          height={1834}
          loading="lazy"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-[min(70vh,40rem)] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center sm:py-32">
        <Reveal>
          <p className="text-[13px] font-medium tracking-[0.16em] text-white/75 uppercase">
            SaveIt.now
          </p>
          <h2 className="font-display mt-5 text-balance text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.03em]">
            Make a home for what you save
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
            Stop losing links in folders and forgotten tabs. Start free, save
            what matters, and ask for it when you need it.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <LandingAppButton
              variant="ember"
              signedOutChildren="Start saving free"
            />
            <a
              href="#pricing"
              className="btn-press inline-flex h-11 items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 text-sm font-medium text-on-dark backdrop-blur-sm hover:bg-white/18"
            >
              Compare plans
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
