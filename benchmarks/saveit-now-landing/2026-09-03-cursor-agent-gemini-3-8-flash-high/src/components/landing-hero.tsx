"use client";

import { LandingAppButton } from "./landing-app-button";
import {
  CheckIcon,
  Loader2Icon,
  SearchIcon,
  SparklesIcon,
  ArrowRightIcon,
  BookmarkIcon,
  Share2Icon,
  CpuIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DEMO_PRESETS = [
  {
    query: "Database architecture and caching",
    statusTags: ["caching fundamentals", "database indexing"],
    summary: "Found 3 resources in your library. Caching patterns, indexing deep dives, and system fundamentals are ready.",
    items: [
      {
        title: "A Crash Course on Caching Fundamentals",
        domain: "swequiz.com",
        tag: "System Design",
        favicon: "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/favicon.ico",
        preview: "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/screenshot.jpg",
      },
      {
        title: "Database Fundamentals and Storage Engines",
        domain: "tontinton.com",
        tag: "Engineering",
        favicon: "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/favicon.png",
        preview: "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/screenshot.jpg",
      },
      {
        title: "Database School: Relational Internals",
        domain: "databaseschool.com",
        tag: "Course",
        favicon: "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/favicon.png",
        preview: "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/screenshot.jpg",
      },
    ],
  },
  {
    query: "Design systems and typography inspiration",
    statusTags: ["type hierarchy", "brand guidelines"],
    summary: "Located 2 bookmarks saved last month covering editorial layouts and modern serif pairings.",
    items: [
      {
        title: "Editorial Design and Digital Typographic Scale",
        domain: "typography.craft",
        tag: "Design",
        favicon: "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/favicon.ico",
        preview: "/images/landing-v2/web/home-1080.webp",
      },
      {
        title: "Spatial Interfaces and Ambient Glow Patterns",
        domain: "ambientui.design",
        tag: "UI Patterns",
        favicon: "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/favicon.png",
        preview: "/images/landing-v2/web/lake-1080.webp",
      },
    ],
  },
];

export const LandingHero = () => {
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [step, setStep] = useState<"typing" | "searching" | "ready">("ready");
  const [typedText, setTypedText] = useState(DEMO_PRESETS[0].query);
  const [customInput, setCustomInput] = useState("");
  const timers = useRef<NodeJS.Timeout[]>([]);

  const activePreset = DEMO_PRESETS[activePresetIndex];

  const triggerSearch = (presetIdx: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setActivePresetIndex(presetIdx);
    const targetQuery = DEMO_PRESETS[presetIdx].query;
    setStep("typing");
    setTypedText("");

    let i = 0;
    const interval = setInterval(() => {
      if (i < targetQuery.length) {
        setTypedText(targetQuery.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setStep("searching");
        const t = setTimeout(() => {
          setStep("ready");
        }, 650);
        timers.current.push(t);
      }
    }, 28);
    timers.current.push(interval as unknown as NodeJS.Timeout);
  };

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setStep("searching");
    setTypedText(customInput);
    setTimeout(() => {
      setStep("ready");
    }, 700);
  };

  return (
    <section className="relative pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-36 lg:pb-36 overflow-hidden">
      {/* Background portal imagery */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <picture>
          <source
            srcSet="/images/landing-v2/web/portal-ridge-1920.webp"
            type="image/webp"
          />
          <img
            src="/images/landing-v2/portal-ridge.png"
            alt="Glowing rectangular portal overlooking dusk mountains"
            className="size-full object-cover object-center opacity-35 filter brightness-75 contrast-110"
            loading="eager"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-[#090708]/70 via-[#090708]/85 to-[#090708]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,107,43,0.18)_0%,transparent_65%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Model Title & Campaign Eyebrow */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8533]/25 bg-[#ff6b2b]/10 px-4 py-1.5 backdrop-blur-md mb-6 shadow-[0_0_20px_rgba(255,107,43,0.2)]">
            <span className="size-2 rounded-full bg-[#ff6b2b] animate-ping" />
            <h1 className="text-xs uppercase tracking-[0.24em] font-semibold text-[#ffc299]">
              gemini-3.8-flash-high
            </h1>
          </div>

          {/* Strong Headline */}
          <h2 className="font-editorial text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.05] text-[#f7f3ee] max-w-4xl">
            Save once.{" "}
            <span className="text-gradient-ember italic">
              Rediscover forever.
            </span>
          </h2>

          {/* Concise Support Copy */}
          <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
            SaveIt.now is your home for bookmarks. Forget folders and lost tabs.
            Save any article, video, PDF, or tweet with one tap, and your autonomous
            agent understands the context so it comes back the second you ask.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <LandingAppButton
              authIntent="signup"
              className="h-12 px-7 text-sm font-semibold text-white bg-gradient-to-r from-[#ff6b2b] via-[#ff7c2b] to-[#ff944d] rounded-full shadow-[0_0_30px_rgba(255,107,43,0.4)] hover:shadow-[0_0_40px_rgba(255,107,43,0.6)] hover:brightness-110 transition-all gap-2"
              signedOutChildren={
                <span className="inline-flex items-center gap-2">
                  Start free today
                  <ArrowRightIcon className="size-4" />
                </span>
              }
            />
            <a
              href="#agent-demo"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-7 text-sm font-medium text-[#f7f3ee] backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:border-white/25"
            >
              See the agent work
            </a>
          </div>

          {/* Micro-guarantee */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#8f7e72]">
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="size-3.5 text-[#ff8533]" />
              No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="size-3.5 text-[#ff8533]" />
              20 bookmarks free forever
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="size-3.5 text-[#ff8533]" />
              Instant browser and iOS capture
            </span>
          </div>
        </div>

        {/* Campaign Imagery & Interactive Agent Demo Console */}
        <div id="agent-demo" className="mt-16 sm:mt-20">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/[0.12] bg-[#110d0f]/90 shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            {/* Console header */}
            <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] px-5 py-3.5 bg-black/40 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-[#ff5f57]" />
                  <div className="size-3 rounded-full bg-[#febc2e]" />
                  <div className="size-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-3.5 text-[#ffa366]" />
                  <span className="text-xs font-semibold tracking-wide text-[#f7f3ee]">
                    SaveIt Autonomous Agent
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#28c840]/30 bg-[#28c840]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#46d65c]">
                  <span className="size-1.5 rounded-full bg-[#28c840] animate-pulse" />
                  Semantic recall active
                </span>
              </div>
            </div>

            {/* Interactive Query Selector Pills */}
            <div className="border-b border-white/[0.06] bg-white/[0.02] px-5 py-2.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#8f7e72] font-medium mr-1 flex items-center gap-1">
                <SearchIcon className="size-3" />
                Test query:
              </span>
              {DEMO_PRESETS.map((preset, idx) => (
                <button
                  key={preset.query}
                  type="button"
                  onClick={() => triggerSearch(idx)}
                  className={`rounded-full px-3 py-1 transition-all text-xs cursor-pointer ${
                    activePresetIndex === idx
                      ? "border border-[#ff8533]/50 bg-[#ff6b2b]/20 text-[#ffa366] font-medium shadow-[0_0_12px_rgba(255,107,43,0.25)]"
                      : "border border-white/10 bg-white/[0.04] text-[#b3a193] hover:text-[#f7f3ee] hover:bg-white/[0.08]"
                  }`}
                >
                  "{preset.query}"
                </button>
              ))}
            </div>

            {/* Console Screen Body */}
            <div className="min-h-[380px] p-6 space-y-5 bg-gradient-to-b from-[#140e11] to-[#0c090a]">
              {/* User search prompt bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-r from-[#ff6b2b] to-[#ff8533] px-5 py-3 shadow-[0_4px_20px_rgba(255,107,43,0.3)]">
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    {typedText}
                    {step === "typing" && (
                      <span className="inline-block h-4 w-[2px] animate-pulse bg-white" />
                    )}
                  </p>
                </div>
              </div>

              {/* Agent processing state */}
              {step === "searching" && (
                <div className="flex items-center gap-3 py-4 text-sm text-[#ffa366]">
                  <Loader2Icon className="size-4 animate-spin text-[#ff8533]" />
                  <span>Scanning conceptual index and full-text vectors...</span>
                </div>
              )}

              {/* Agent results display */}
              {step === "ready" && (
                <div className="space-y-4">
                  {/* Category confirmation tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#8f7e72]">Resolved tags:</span>
                    {activePreset.statusTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-[#ffc299]"
                      >
                        <CheckIcon className="size-3 text-[#28c840]" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Bookmark Cards Grid */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {activePreset.items.map((b) => (
                      <div
                        key={b.title}
                        className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all hover:border-[#ff8533]/40 hover:bg-white/[0.06] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#1c1417]">
                          <img
                            src={b.preview}
                            alt={b.title}
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
                            loading="lazy"
                          />
                          <span className="absolute top-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-[#ffa366] backdrop-blur-sm">
                            {b.tag}
                          </span>
                        </div>
                        <div className="p-3">
                          <div className="mb-1 flex items-center gap-1.5">
                            <img
                              src={b.favicon}
                              alt=""
                              className="size-3.5 rounded-sm"
                              loading="lazy"
                            />
                            <span className="truncate text-[11px] text-[#8f7e72]">
                              {b.domain}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs font-medium text-[#f7f3ee] group-hover:text-white">
                            {b.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Agent Response message */}
                  <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#ff6b2b]/20 border border-[#ff6b2b]/30">
                      <SparklesIcon className="size-3.5 text-[#ff8533]" />
                    </div>
                    <p className="text-xs sm:text-sm text-[#d4c6ba] leading-relaxed pt-0.5">
                      {activePreset.summary}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Live Interactive Input Bar */}
            <form onSubmit={handleCustomSubmit} className="border-t border-white/[0.08] p-3 bg-black/40">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 focus-within:border-[#ff8533]/60 focus-within:bg-white/[0.06] transition-all">
                <SearchIcon className="size-4 text-[#8f7e72]" />
                <input
                  type="text"
                  placeholder="Ask your agent anything about your bookmarks..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-[#f7f3ee] placeholder-[#8f7e72] outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#ff6b2b] px-3 py-1 text-xs font-medium text-white transition-all hover:bg-[#ff8533]"
                >
                  Retrieve
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
