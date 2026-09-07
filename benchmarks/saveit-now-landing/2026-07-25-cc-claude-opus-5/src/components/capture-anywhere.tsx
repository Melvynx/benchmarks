import { useId, useRef, useState } from "react";

import { EXTENSIONS_URL } from "../lib/site";
import { Cta, CtaArrow } from "./ui/cta";
import { Reveal } from "./ui/reveal";
import { SectionLabel } from "./ui/section-label";

/** Real recordings of the browser extension, shipped with the project. */
const CLIPS = [
  {
    key: "pin",
    label: "Pin it once",
    src: "/docs/pin-extensions.gif",
    alt: "Screen recording of the SaveIt extension being pinned to the browser toolbar.",
    body: "Add SaveIt to Chrome or Firefox and pin it to the toolbar. One icon, always within reach of whatever you are reading.",
  },
  {
    key: "page",
    label: "Save the page",
    src: "/docs/save-link.gif",
    alt: "Screen recording of a web page being saved to SaveIt with a single click on the extension icon.",
    body: "One click on any page, video, post or PDF. You can close the tab straight away, because the reading and the filing start without you.",
  },
  {
    key: "image",
    label: "Save an image",
    src: "/docs/save-image2.gif",
    alt: "Screen recording of an image being saved to SaveIt from the browser right click menu.",
    body: "Right click any image and send it to your library along with the page it came from, so the reference keeps its context.",
  },
] as const;

/**
 * Proof for the capture step, using the product's own recordings rather than
 * an invented mock. Only the visible clip is mounted, which keeps the page
 * from downloading roughly two megabytes of animation up front.
 */
export function CaptureAnywhere() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const clip = CLIPS[active];

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = CLIPS.length - 1;
    const next: Record<string, number> = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    const target = next[event.key];
    if (target === undefined) return;
    event.preventDefault();
    setActive(target);
    tabRefs.current[target]?.focus();
  };

  return (
    <section className="relative pb-24 sm:pb-32 lg:pb-40">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <SectionLabel index="03">Capture</SectionLabel>
            <h2 className="display-md mt-6 text-glow">
              Saving takes one click.{" "}
              <em className="italic text-muted">There is no step two.</em>
            </h2>
          </div>
          <Cta href={EXTENSIONS_URL} variant="ghost" size="lg">
            Get the extension
            <CtaArrow />
          </Cta>
        </Reveal>

        <Reveal
          delay={100}
          className="mt-12 overflow-hidden rounded-2xl border border-lilac/12 bg-ink-2/70"
        >
          <div
            role="tablist"
            aria-label="Ways to save from the browser"
            onKeyDown={onKeyDown}
            className="flex flex-wrap gap-1 border-b border-lilac/10 p-2"
          >
            {CLIPS.map((item, index) => {
              const isActive = index === active;
              return (
                <button
                  key={item.key}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${item.key}`}
                  aria-selected={isActive}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActive(index)}
                  className={`rounded-full px-4 py-2 text-[13px] transition-colors duration-300 ${
                    isActive
                      ? "bg-white/[0.08] text-glow"
                      : "text-muted hover:bg-white/[0.04] hover:text-cream"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${clip.key}`}
            tabIndex={0}
            className="grid grid-cols-1 gap-8 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:p-8"
          >
            <div className="overflow-hidden rounded-xl border border-lilac/12 bg-ink">
              <img
                key={clip.key}
                src={clip.src}
                alt={clip.alt}
                width={800}
                height={451}
                loading="lazy"
                decoding="async"
                className="aspect-16/9 w-full object-cover"
              />
            </div>
            <p className="text-[15px] leading-relaxed text-muted sm:text-base">
              {clip.body}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
