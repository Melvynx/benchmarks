"use client";

import { DownloadIcon, SparklesIcon, CheckIcon, ChromeIcon, GlobeIcon, ImageDownIcon } from "lucide-react";

interface ExtensionCard {
  id: string;
  badge: string;
  title: string;
  description: string;
  gif: string;
  tag: string;
}

const EXTENSION_FEATURES: ExtensionCard[] = [
  {
    id: "install",
    badge: "One-Click Pin",
    title: "Always at Hand",
    description:
      "Pin the SaveIt icon to your browser toolbar in Chrome, Brave, Edge, or Firefox. One click captures whatever page you are reading.",
    gif: "/docs/pin-extensions.gif",
    tag: "Toolbar Extension",
  },
  {
    id: "save-pages",
    badge: "Universal Web",
    title: "Save Any Link",
    description:
      "Articles, YouTube videos, GitHub repositories, research PDFs, or social threads. Capture with a single click, and the agent extracts the full text.",
    gif: "/docs/save-link.gif",
    tag: "Deep Page Capture",
  },
  {
    id: "save-images",
    badge: "Visual Context",
    title: "Right-Click Images",
    description:
      "Right-click on diagrams, infographics, or artwork to save them directly to your collection. Color palettes and layout details are indexed automatically.",
    gif: "/docs/save-image2.gif",
    tag: "Asset Extraction",
  },
];

export const ExtensionsSection = () => {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-[#090708]">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8533]/30 bg-[#ff6b2b]/10 px-4 py-1.5 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(255,107,43,0.15)]">
            <GlobeIcon className="size-4 text-[#ff8533]" />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#ffc299]">
              Desktop Integration
            </span>
          </div>

          <h2 className="font-editorial text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[#f7f3ee]">
            One click.{" "}
            <span className="text-gradient-ember italic">
              Forever remembered.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
            Lightweight, unobtrusive extensions for your favorite desktop browsers.
            No sidebar clutter, no complex forms. Just click and keep moving.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {EXTENSION_FEATURES.map((item) => (
            <div
              key={item.id}
              className="group rounded-3xl border border-white/10 bg-[#120e10] p-6 shadow-xl transition-all hover:border-[#ff8533]/40 hover:bg-[#161113]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black/60">
                <img
                  src={item.gif}
                  alt={item.title}
                  className="size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute top-2.5 right-2.5 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-medium text-[#ffa366] backdrop-blur-md border border-white/10">
                  {item.tag}
                </span>
              </div>

              <div className="mt-6 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff8533]">
                  {item.badge}
                </span>
                <h3 className="text-lg font-semibold text-[#f7f3ee]">{item.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-[#c4b5a8]">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Extension CTAs */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://saveit.now/extensions"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-xs font-semibold text-[#090708] shadow-lg transition-all hover:bg-[#e4d7cc]"
          >
            <DownloadIcon className="size-4" />
            Add to Chrome (Free)
          </a>
          <a
            href="https://saveit.now/extensions"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 text-xs font-medium text-white transition-all hover:bg-white/[0.08]"
          >
            <GlobeIcon className="size-4" />
            Firefox & Safari
          </a>
        </div>
      </div>
    </section>
  );
};
