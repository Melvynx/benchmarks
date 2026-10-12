"use client";

import { ArrowDownIcon, PlayIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const line1 = "Save it once.";
const line2 = "Find it forever.";

export const LandingHero = () => {
  const [sent, setSent] = useState(false);
  const [found, setFound] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const run = () => {
      setSent(false);
      setFound(false);
      timers.current.push(
        window.setTimeout(() => setSent(true), 1400),
        window.setTimeout(() => setFound(true), 2600),
        window.setTimeout(run, 7000)
      );
    };
    run();
    const stash = timers.current;
    return () => stash.forEach(clearTimeout);
  }, []);

  return (
    <section id="top" className="relative overflow-hidden pt-16">
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src="/images/landing-v2/portal-ridge.png"
          alt=""
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#100b08]/55 via-[#100b08]/35 to-[#100b08]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#100b08]/65 via-[#100b08]/20 to-[#100b08]/30" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:pb-24">
        <div className="max-w-3xl">
          <p className="eyebrow reveal">SaveIt.now is your home for bookmarks</p>
          <h1 className="display-xl reveal mt-5 text-[13vw] text-[#fff6ec] sm:text-7xl lg:text-8xl">
            Muse Spark 1.3
          </h1>
          <p className="display-xl reveal mt-4 text-4xl text-[#ffd9b8] sm:text-5xl lg:text-6xl">
            {line1}
            <br />
            <em className="text-[#ffc36b]">{line2}</em>
          </p>
          <p className="reveal mt-6 max-w-xl text-base leading-relaxed text-[#f3d9bd] sm:text-lg">
            You only save. SaveIt captures, understands, organizes and retrieves,
            so the link, video or idea you kept is there the moment you ask.
          </p>

          <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#cta" className="btn-primary">
              <SparklesIcon className="size-4" />
              Start saving free
            </a>
            <a href="#workflow" className="btn-ghost">
              <PlayIcon className="size-4" />
              See how it works
            </a>
          </div>
          <p className="reveal mt-4 text-sm text-[#c9b3a1]">
            Free to start. No credit card needed. Your saves stay findable.
          </p>
        </div>

        <div className="reveal mt-12 grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
          <div className="hero-img-frame relative overflow-hidden rounded-3xl">
            <img
              src="/images/landing-v2/portal-ridge.png"
              alt="A glowing doorway on a mountain ridge at sunset, the campaign image for instant retrieval"
              className="aspect-[16/10] w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#100b08]/85 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffc36b]">
                  Campaign scene 01
                </p>
                <p className="mt-1 font-elegant text-xl text-white sm:text-2xl">
                  The doorway back to everything you saved
                </p>
              </div>
              <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs text-white backdrop-blur">
                Retrieval, visualized
              </span>
            </div>
          </div>

          <div className="card flex flex-col justify-between rounded-3xl p-6 sm:p-7">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffc36b]">
                  Live save demo
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    found ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-[#f3d9bd]"
                  }`}
                  role="status"
                >
                  <span
                    className={`size-1.5 rounded-full ${found ? "bg-emerald-300" : "animate-pulse bg-[#ffc36b]"}`}
                  />
                  {found ? "Found it" : sent ? "Organizing" : "Saving"}
                </span>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm text-[#c9b3a1]">You saved</p>
                <p className="mt-1 text-[15px] font-medium text-white">
                  The quiet guide to better deep work
                </p>
                <p className="mt-1 text-xs text-[#8f7a6b]">from focuslab.blog</p>
              </div>
              <div className="mt-3 space-y-2 text-sm" aria-live="polite">
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                    sent ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-[#8f7a6b]"
                  }`}
                >
                  <span aria-hidden="true">{sent ? "✓" : "○"}</span>
                  Captured with summary and screenshot
                </div>
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                    sent ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-[#8f7a6b]"
                  }`}
                >
                  <span aria-hidden="true">{sent ? "✓" : "○"}</span>
                  Filed under Focus, no folders touched
                </div>
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                    found ? "border-[#ffc36b]/40 bg-[#ff5a1f]/15 text-[#ffd9b8]" : "border-white/10 bg-white/5 text-[#8f7a6b]"
                  }`}
                >
                  <span aria-hidden="true">{found ? "✓" : "○"}</span>
                  {found ? "Asked “that deep work piece” and got it back" : "Waiting for your question"}
                </div>
              </div>
            </div>
            <a
              href="#workflow"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#ffc36b] hover:text-white"
            >
              Watch the full workflow
              <ArrowDownIcon className="size-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="marquee relative border-y border-white/10 bg-[#100b08]/80 py-4 backdrop-blur">
        <div className="marquee-track text-sm font-medium uppercase tracking-[0.25em] text-[#c9b3a1]">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ["No folders", "No tab hoarding", "No lost links", "Just save it", "Ask and find"].map((t, i) => (
              <span key={`${k}-${i}`} className="flex items-center gap-12">
                <span>{t}</span>
                <span className="text-[#ff5a1f]" aria-hidden="true">✦</span>
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
