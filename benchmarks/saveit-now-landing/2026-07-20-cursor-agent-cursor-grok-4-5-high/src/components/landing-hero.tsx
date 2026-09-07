import { useEffect, useState } from "react";
import { LandingAppButton } from "./landing-app-button";

export function LandingHero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setReady(true);
      return;
    }
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      id="top"
      className="relative min-h-[100dvh] overflow-hidden text-on-dark"
    >
      <div className="absolute inset-0">
        <img
          src="/images/landing-v2/portal-ridge.png"
          alt="A glowing rectangular portal on a sunlit mountain ridge, the path leading home to what you saved"
          className="hero-ken size-full object-cover object-center"
          width={3272}
          height={1834}
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-[oklch(0.995_0.002_80)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[oklch(0.995_0.002_80)] to-transparent sm:h-40"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-end px-6 pb-24 pt-28 sm:pb-20 sm:pt-32 lg:pb-24">
        <div className="max-w-3xl">
          <p
            className={`mb-4 text-[12px] font-medium tracking-[0.18em] text-white/80 uppercase transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:mb-5 sm:text-[13px] ${
              ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            SaveIt.now
          </p>

          <h1
            className={`font-display text-balance text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.03em] text-on-dark transition-[opacity,transform] duration-700 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              ready ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            Cursor Grok 4.5
          </h1>

          <p
            className={`mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-white/90 sm:mt-6 sm:text-lg transition-[opacity,transform] duration-700 delay-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              ready ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            Your home for bookmarks. Save once. We capture, understand,
            organize, and bring it back when you ask. No folders to maintain.
          </p>

          <div
            className={`mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center transition-[opacity,transform] duration-700 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              ready ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <LandingAppButton
              variant="ember"
              className="w-full sm:w-auto"
              signedOutChildren="Start saving free"
            />
            <a
              href="#how"
              className="btn-press inline-flex h-11 w-full items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 text-sm font-medium text-on-dark backdrop-blur-sm hover:bg-white/18 sm:w-auto"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
