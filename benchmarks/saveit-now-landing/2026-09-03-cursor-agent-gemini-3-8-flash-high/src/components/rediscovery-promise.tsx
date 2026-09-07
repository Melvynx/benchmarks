"use client";

import { useState } from "react";
import {
  SparklesIcon,
  ShieldCheckIcon,
  SearchIcon,
  FlameIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  HistoryIcon,
} from "lucide-react";

export const RediscoveryPromise = () => {
  const [selectedScenario, setSelectedScenario] = useState<number>(0);

  const scenarios = [
    {
      title: "Vague Conceptual Memory",
      userQuery: "that article about why microservices fail during network partitions",
      conventionalResult: "0 results found (no exact keyword match for 'partitions')",
      saveItResult: "Surfaces 'Fallacies of Distributed Computing Part 3' from 8 months ago, highlighting the network partition section.",
    },
    {
      title: "Visual & Interface Reference",
      userQuery: "the landing page with warm sunset glows and dark obsidian cards",
      conventionalResult: "Requires opening 40 bookmarks one by one in tabs",
      saveItResult: "Pulls visual screenshots of three design references matching the warm palette and spatial layout.",
    },
    {
      title: "Multi-Format Recall",
      userQuery: "the podcast clip discussing postgres indexing tricks",
      conventionalResult: "Lost in YouTube history or notes app",
      saveItResult: "Identifies timestamped YouTube transcript snippet covering B-tree vs BRIN indexes.",
    },
  ];

  return (
    <section id="promise" className="relative py-24 sm:py-32 overflow-hidden bg-[#090708]">
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8533]/30 bg-[#ff6b2b]/10 px-4 py-1.5 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(255,107,43,0.15)]">
            <ShieldCheckIcon className="size-4 text-[#ff8533]" />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#ffc299]">
              The Core Commitment
            </span>
          </div>

          <h2 className="font-editorial text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[#f7f3ee]">
            The 100%{" "}
            <span className="text-gradient-ember italic">
              Rediscovery Promise.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
            The tragedy of modern bookmarks is digital amnesia. You save a brilliant
            essay or reference, only to lose it in a graveyard of nested folders.
            Our product exists for one purpose: if you saved it once, you will
            always find it again.
          </p>
        </div>

        {/* Cinematic Imagery Banner: Lake Reflection */}
        <div className="mt-14 relative overflow-hidden rounded-3xl border border-white/10 bg-[#120d0f] shadow-[0_20px_80px_rgba(0,0,0,0.7)] group">
          <div className="aspect-[21/9] sm:aspect-[2.4/1] w-full overflow-hidden">
            <picture>
              <source
                srcSet="/images/landing-v2/web/lake-1920.webp"
                type="image/webp"
              />
              <img
                src="/images/landing-v2/lake.png"
                alt="Coral lit mountain peak reflected in still turquoise alpine lake"
                className="size-full object-cover object-center transition-transform duration-1000 group-hover:scale-105 filter brightness-95 contrast-110"
                loading="lazy"
              />
            </picture>
          </div>

          {/* Ethereal gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090708] via-[#090708]/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090708]/80 via-transparent to-[#090708]/40" />

          {/* Floating statement inside image */}
          <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-medium text-[#ffa366] backdrop-blur-md mb-3">
                <SparklesIcon className="size-3 text-[#ff8533]" />
                Crystalline Clarity
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl lg:text-4xl text-white leading-tight">
                Reflecting your knowledge with zero distortion.
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#e4d7cc] leading-relaxed">
                Like calm alpine water, SaveIt.now reflects back the exact thought you
                stored, even when months have passed.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-black/70 p-4 sm:p-5 backdrop-blur-md self-start sm:self-auto min-w-[200px]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff8533]">
                Knowledge Confidence
              </span>
              <p className="mt-1 text-2xl sm:text-3xl font-bold text-white">
                100%
              </p>
              <p className="text-xs text-[#a8978b]">
                Searchable by concept, quote, or memory
              </p>
            </div>
          </div>
        </div>

        {/* The 3 Pillars of Confidence */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#140e11]/80 p-6 sm:p-8 transition-all hover:border-[#ff8533]/40 hover:bg-[#1a1215]">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#ff6b2b]/15 text-[#ff8533] border border-[#ff6b2b]/30 mb-5">
              <SearchIcon className="size-5" />
            </div>
            <h4 className="text-lg font-semibold text-[#f7f3ee]">
              Semantic Understanding
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[#c4b5a8]">
              Never worry about matching exact keywords or title tags. The agent
              comprehends concepts, synonyms, and context so your natural language
              thoughts find their mark immediately.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#140e11]/80 p-6 sm:p-8 transition-all hover:border-[#ff8533]/40 hover:bg-[#1a1215]">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#ff6b2b]/15 text-[#ff8533] border border-[#ff6b2b]/30 mb-5">
              <HistoryIcon className="size-5" />
            </div>
            <h4 className="text-lg font-semibold text-[#f7f3ee]">
              Permanent Snapshot
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[#c4b5a8]">
              Pages edit, paywalls appear, and links rot. SaveIt preserves clean
              text content and visual snapshots upon save, ensuring your references
              remain intact regardless of web changes.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#140e11]/80 p-6 sm:p-8 transition-all hover:border-[#ff8533]/40 hover:bg-[#1a1215]">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#ff6b2b]/15 text-[#ff8533] border border-[#ff6b2b]/30 mb-5">
              <EyeIcon className="size-5" />
            </div>
            <h4 className="text-lg font-semibold text-[#f7f3ee]">
              Serendipitous Surfacing
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[#c4b5a8]">
              Rediscovery goes both ways. When you research or write, your agent
              gently surfaces past bookmarks that relate to your current focus,
              connecting ideas across time without prompting.
            </p>
          </div>
        </div>

        {/* Interactive Comparison Simulator */}
        <div className="mt-14 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-semibold text-[#f7f3ee]">
                Real-World Rediscovery Scenarios
              </h3>
              <p className="text-xs text-[#8f7e72] mt-0.5">
                See how fuzzy human memories resolve cleanly with SaveIt.now.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {scenarios.map((sc, idx) => (
                <button
                  key={sc.title}
                  type="button"
                  onClick={() => setSelectedScenario(idx)}
                  className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all ${
                    selectedScenario === idx
                      ? "bg-[#ff6b2b] text-white font-medium shadow-[0_0_15px_rgba(255,107,43,0.3)]"
                      : "bg-white/[0.05] text-[#b3a193] hover:text-white"
                  }`}
                >
                  {sc.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* User prompt */}
            <div className="md:col-span-4 rounded-xl border border-white/[0.06] bg-black/40 p-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8f7e72]">
                What you remember
              </span>
              <p className="mt-2 text-sm text-[#f7f3ee] italic">
                "{scenarios[selectedScenario].userQuery}"
              </p>
            </div>

            {/* Traditional folders result */}
            <div className="md:col-span-4 rounded-xl border border-red-500/20 bg-red-950/10 p-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-red-400/90">
                Traditional folder search
              </span>
              <p className="mt-2 text-xs text-[#a88d8d] leading-relaxed">
                {scenarios[selectedScenario].conventionalResult}
              </p>
            </div>

            {/* SaveIt agent result */}
            <div className="md:col-span-4 rounded-xl border border-[#ff8533]/40 bg-[#ff6b2b]/10 p-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#ffa366] flex items-center gap-1.5">
                <SparklesIcon className="size-3 text-[#ff8533]" />
                SaveIt Agent
              </span>
              <p className="mt-2 text-xs text-[#f7f3ee] font-medium leading-relaxed">
                {scenarios[selectedScenario].saveItResult}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
