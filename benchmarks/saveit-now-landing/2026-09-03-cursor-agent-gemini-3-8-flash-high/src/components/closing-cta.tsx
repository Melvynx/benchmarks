"use client";

import { LandingAppButton } from "./landing-app-button";
import { ArrowRightIcon, SparklesIcon, CheckIcon } from "lucide-react";

export const ClosingCta = () => {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-[#090708]">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#120d0f] shadow-[0_25px_100px_rgba(0,0,0,0.8)]">
          {/* Background Portal Rocks Campaign Image */}
          <div className="absolute inset-0 z-0">
            <picture>
              <source
                srcSet="/images/landing-v2/web/portal-rocks-1920.webp"
                type="image/webp"
              />
              <img
                src="/images/landing-v2/portal-rocks.png"
                alt="Glowing portal doorway framed by massive boulders"
                className="size-full object-cover object-center opacity-45 filter brightness-90 contrast-110"
                loading="lazy"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-[#090708] via-[#090708]/60 to-[#090708]/80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,107,43,0.15)_0%,transparent_70%)]" />
          </div>

          {/* Content */}
          <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-24 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8533]/30 bg-black/60 px-4 py-1.5 backdrop-blur-md mb-6 shadow-[0_0_20px_rgba(255,107,43,0.2)]">
              <SparklesIcon className="size-4 text-[#ff8533]" />
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#ffc299]">
                Step Through The Portal
              </span>
            </div>

            <h2 className="font-editorial text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-white">
              Stop saving to forget.{" "}
              <span className="text-gradient-ember italic">
                Save to remember.
              </span>
            </h2>

            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
              Join thousands of researchers, designers, and engineers who have
              replaced filing chores with autonomous rediscovery. Your first 20
              bookmarks are completely free forever.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <LandingAppButton
                authIntent="signup"
                className="h-12 px-8 text-sm font-semibold text-white bg-gradient-to-r from-[#ff6b2b] via-[#ff7c2b] to-[#ff944d] rounded-full shadow-[0_0_30px_rgba(255,107,43,0.4)] hover:shadow-[0_0_40px_rgba(255,107,43,0.6)] hover:brightness-110 transition-all gap-2"
                signedOutChildren={
                  <span className="inline-flex items-center gap-2">
                    Get started free
                    <ArrowRightIcon className="size-4" />
                  </span>
                }
              />
              <a
                href="#pricing"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.05] px-7 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/[0.1] hover:border-white/30"
              >
                View Pro options
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#8f7e72]">
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="size-3.5 text-[#ff8533]" />
                No credit card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="size-3.5 text-[#ff8533]" />
                One-click browser extension setup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="size-3.5 text-[#ff8533]" />
                Full export freedom anytime
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
