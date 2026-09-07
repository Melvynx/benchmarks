"use client";

import { useState } from "react";
import {
  ShareIcon,
  SmartphoneIcon,
  SparklesIcon,
  ZapIcon,
  SearchIcon,
  CompassIcon,
  CheckIcon,
  SlidersIcon,
  LayersIcon,
} from "lucide-react";

interface IosFeature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  systemAction: string;
}

const IOS_FEATURES: IosFeature[] = [
  {
    id: "share-sheet",
    title: "System Share Sheet",
    subtitle: "One tap from any application",
    description:
      "Save directly from Safari, YouTube, X, Reddit, or Podcasts. Tap the native iOS Share icon, select SaveIt, and continue reading without interruption.",
    badge: "Native Extension",
    systemAction: "Safari → Share → SaveIt.now",
  },
  {
    id: "action-button",
    title: "Action Button & Shortcuts",
    subtitle: "Physical instant capture",
    description:
      "Map your iPhone Action Button or Back Tap gesture to SaveIt. Save the current clipboard link or trigger a quick voice query in an instant.",
    badge: "Hardware Native",
    systemAction: "Single Click → Haptic Ingestion",
  },
  {
    id: "spotlight",
    title: "Spotlight Integration",
    subtitle: "Search without opening the app",
    description:
      "Your bookmarks index into iOS CoreSpotlight. Swipe down on your Home Screen, type what you remember, and jump directly to your saved reference.",
    badge: "CoreSpotlight API",
    systemAction: "Swipe Down → Instant Semantic Hit",
  },
  {
    id: "widgets",
    title: "Interactive Home Widgets",
    subtitle: "Glanceable memory on your desktop",
    description:
      "Live widgets show recent saves, smart collections, and contextual resurfacing items tailored to your current projects throughout the day.",
    badge: "WidgetKit",
    systemAction: "Lock Screen & Home Display",
  },
];

export const IosExperience = () => {
  const [activeTab, setActiveTab] = useState("share-sheet");

  const currentFeature =
    IOS_FEATURES.find((f) => f.id === activeTab) || IOS_FEATURES[0];

  return (
    <section id="ios" className="relative py-24 sm:py-32 overflow-hidden bg-[#090708]">
      {/* Subtle background ambient light */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(255,107,43,0.08)_0%,transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8533]/30 bg-[#ff6b2b]/10 px-4 py-1.5 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(255,107,43,0.15)]">
            <SmartphoneIcon className="size-4 text-[#ff8533]" />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#ffc299]">
              Native Mobile Craft
            </span>
          </div>

          <h2 className="font-editorial text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[#f7f3ee]">
            Pocket portal.{" "}
            <span className="text-gradient-ember italic">
              The iOS experience.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
            Great bookmarking must live where you live. On iOS, SaveIt.now feels
            like an organic extension of your operating system: fast, silent,
            and deeply integrated into native system hooks.
          </p>
        </div>

        {/* Content Layout with Portal Arch Campaign Image */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Campaign Imagery: Portal Arch */}
          <div className="lg:col-span-5">
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#120d0f] shadow-2xl transition-all hover:border-[#ff8533]/40">
              <div className="aspect-[4/5] w-full overflow-hidden">
                <picture>
                  <source
                    srcSet="/images/landing-v2/web/portal-arch-1080.webp"
                    type="image/webp"
                  />
                  <img
                    src="/images/landing-v2/portal-arch.png"
                    alt="Glowing portal archway among wild rocks and flora"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-90 contrast-105"
                    loading="lazy"
                  />
                </picture>
              </div>

              {/* Editorial backdrop caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090708] via-[#090708]/30 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-medium text-[#ffa366] backdrop-blur-md mb-2">
                  <SparklesIcon className="size-3 text-[#ff8533]" />
                  Everywhere You Go
                </span>
                <h3 className="font-editorial text-2xl text-white">
                  The Pocket Archway
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#d4c6ba] leading-relaxed">
                  A doorway to your library available on every screen, inside every
                  app, through native system extensions.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Native Feature Panel */}
          <div className="lg:col-span-7 space-y-4">
            {/* Feature selector tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/[0.08] pb-4">
              {IOS_FEATURES.map((feat) => {
                const isActive = feat.id === activeTab;
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => setActiveTab(feat.id)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium transition-all text-left cursor-pointer border ${
                      isActive
                        ? "border-[#ff8533]/60 bg-[#ff6b2b]/15 text-[#ffa366] shadow-[0_0_15px_rgba(255,107,43,0.2)]"
                        : "border-white/5 bg-white/[0.02] text-[#8f7e72] hover:text-[#f7f3ee] hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="block truncate font-semibold">{feat.title}</span>
                    <span className="block text-[10px] opacity-75 mt-0.5">{feat.badge}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Card Showcase */}
            <div className="rounded-2xl border border-white/10 bg-[#140e11] p-6 sm:p-8 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff8533]">
                    {currentFeature.badge}
                  </span>
                  <h4 className="font-editorial text-2xl text-[#f7f3ee] mt-1">
                    {currentFeature.title}
                  </h4>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-mono text-[#ffc299]">
                  {currentFeature.systemAction}
                </div>
              </div>

              <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#c4b5a8]">
                {currentFeature.description}
              </p>

              {/* Native System Simulation Card (No fake screenshots) */}
              <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/40 p-5">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8f7e72]">
                  Interaction Protocol
                </span>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ff6b2b]/20 border border-[#ff6b2b]/30 text-[#ff8533]">
                    <ZapIcon className="size-4" />
                  </div>
                  <div className="text-xs text-[#d4c6ba] leading-relaxed">
                    <span className="font-semibold text-white">Zero friction pipeline: </span>
                    Triggered in under 200 milliseconds. Background task handles
                    metadata parsing without blocking foreground iOS applications.
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary mobile credibility points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#f7f3ee]">
                  <CheckIcon className="size-4 text-[#ff8533]" />
                  Offline-Ready Knowledge
                </div>
                <p className="mt-1 text-xs text-[#8f7e72] leading-relaxed">
                  Saved articles and summaries stay accessible on airplane mode
                  or underground commutes.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#f7f3ee]">
                  <CheckIcon className="size-4 text-[#ff8533]" />
                  iCloud Private Sync
                </div>
                <p className="mt-1 text-xs text-[#8f7e72] leading-relaxed">
                  Seamless synchronization across your iPhone, iPad, and desktop
                  browsers in real time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
