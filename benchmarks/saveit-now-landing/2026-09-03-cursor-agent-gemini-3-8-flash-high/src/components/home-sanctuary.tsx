"use client";

import { SparklesIcon, CheckIcon, CompassIcon, ArrowRightIcon } from "lucide-react";

export const HomeSanctuary = () => {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-[#090708]">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left content: Editorial narrative */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8533]/30 bg-[#ff6b2b]/10 px-4 py-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(255,107,43,0.15)]">
              <CompassIcon className="size-4 text-[#ff8533]" />
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#ffc299]">
                The Sanctuary
              </span>
            </div>

            <h2 className="font-editorial text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[#f7f3ee]">
              Your home for bookmarks.{" "}
              <span className="text-gradient-ember italic">
                Built to last.
              </span>
            </h2>

            <p className="text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
              Most of the internet gets consumed in a hurry. You encounter a masterclass
              video, a profound essay, or a technical breakthrough, and you tuck it
              away somewhere fragile: a crowded browser bar, an endless group chat, or
              a graveyard of open tabs.
            </p>

            <p className="text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
              SaveIt.now gives your curiosity a permanent residence. A tranquil space
              where every item you value is preserved, understood, and waiting for your
              return.
            </p>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#f7f3ee]">
                  <CheckIcon className="size-4 text-[#ff8533]" />
                  Zero Cognitive Load
                </div>
                <p className="mt-1 text-xs text-[#8f7e72] leading-relaxed">
                  Never decide which folder an idea belongs to. Just save it.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#f7f3ee]">
                  <CheckIcon className="size-4 text-[#ff8533]" />
                  Infinite External Mind
                </div>
                <p className="mt-1 text-xs text-[#8f7e72] leading-relaxed">
                  Recall any concept even when you have forgotten the original title.
                </p>
              </div>
            </div>
          </div>

          {/* Right image: home.png */}
          <div className="lg:col-span-6">
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#140e11] shadow-[0_20px_80px_rgba(0,0,0,0.7)]">
              <div className="aspect-[4/3] w-full overflow-hidden">
                <picture>
                  <source
                    srcSet="/images/landing-v2/web/home-1080.webp"
                    type="image/webp"
                  />
                  <img
                    src="/images/landing-v2/home.png"
                    alt="Illuminated warm cottage on a hill of flowers at golden hour"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-95 contrast-105"
                    loading="lazy"
                  />
                </picture>
              </div>

              {/* Gradient lighting & caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090708] via-[#090708]/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-medium text-[#ffa366] backdrop-blur-md mb-2">
                  <SparklesIcon className="size-3 text-[#ff8533]" />
                  Warmth in Order
                </span>
                <p className="font-editorial text-xl sm:text-2xl text-white">
                  A lit beacon at the end of every digital path.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
