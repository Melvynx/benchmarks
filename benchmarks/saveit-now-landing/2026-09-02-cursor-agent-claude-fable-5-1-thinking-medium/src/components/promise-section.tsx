import {
  FolderXIcon,
  SearchIcon,
  SparklesIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { images } from "../lib/images";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { CampaignPicture } from "./campaign-image";

const QUERIES = [
  {
    prompt: "the Japanese knife video I watched in spring",
    result: {
      kind: "YouTube",
      title: "How a master sharpens a gyuto by hand",
      meta: "Saved from the iOS share sheet",
      tags: ["Cooking", "Craft"],
    },
  },
  {
    prompt: "that thread about pricing pages with good examples",
    result: {
      kind: "Thread",
      title: "12 pricing pages that quietly do everything right",
      meta: "Saved with the browser extension",
      tags: ["Pricing", "Design"],
    },
  },
  {
    prompt: "the paper on long context retrieval",
    result: {
      kind: "PDF",
      title: "Lost in the Middle: How Language Models Use Long Contexts",
      meta: "Saved from a shared link",
      tags: ["Research", "AI"],
    },
  },
  {
    prompt: "recipe with the burnt honey and figs",
    result: {
      kind: "Article",
      title: "Roasted figs with burnt honey and labneh",
      meta: "Saved from Safari on iPhone",
      tags: ["Recipe", "Weekend"],
    },
  },
] as const;

const PILLARS = [
  {
    icon: SearchIcon,
    title: "Search that understands meaning",
    body: "Describe what you remember, even loosely. The agent matches ideas, not just the exact words in a title.",
  },
  {
    icon: FolderXIcon,
    title: "Nothing hidden in a folder",
    body: "There is no wrong place to put a save because you never put it anywhere. Every item stays reachable from one place.",
  },
  {
    icon: WandSparklesIcon,
    title: "Context written for you",
    body: "Summaries and tags are generated at save time, so a link you saved months ago still explains itself today.",
  },
];

export const PromiseSection = () => {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "thinking" | "answer">("typing");
  const [manual, setManual] = useState(false);

  const current = QUERIES[index];

  useEffect(() => {
    if (reducedMotion) {
      setTyped(current.prompt);
      setPhase("answer");
      return;
    }

    setTyped("");
    setPhase("typing");
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const type = () => {
      i += 1;
      setTyped(current.prompt.slice(0, i));
      if (i < current.prompt.length) {
        timers.push(setTimeout(type, 34));
      } else {
        timers.push(setTimeout(() => setPhase("thinking"), 250));
        timers.push(setTimeout(() => setPhase("answer"), 1100));
        if (!manual) {
          timers.push(
            setTimeout(() => setIndex((value) => (value + 1) % QUERIES.length), 5200),
          );
        }
      }
    };
    timers.push(setTimeout(type, 420));
    return () => timers.forEach(clearTimeout);
  }, [current, manual, reducedMotion]);

  return (
    <section
      id="promise"
      className="relative isolate scroll-mt-20 overflow-hidden py-28 sm:py-36"
      aria-labelledby="promise-title"
    >
      <CampaignPicture
        image={images.arch}
        className="absolute inset-0 -z-20"
        imgClassName="object-[50%_40%]"
        sizes="100vw"
        decorative
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(12_10_16)_0%,rgb(12_10_16/0.55)_18%,rgb(12_10_16/0.45)_60%,rgb(12_10_16)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_45%,transparent_20%,rgb(12_10_16/0.75)_100%)]"
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p
            data-reveal
            className="inline-flex items-center gap-2 text-[12px] font-medium tracking-[0.14em] text-blush uppercase"
          >
            <span className="h-px w-6 bg-current" aria-hidden />
            The 100% promise
            <span className="h-px w-6 bg-current" aria-hidden />
          </p>
          <h2
            id="promise-title"
            data-reveal
            style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
            className="font-display mt-6 text-cream"
          >
            <span className="block text-[clamp(6rem,22vw,15rem)] leading-[0.82] tracking-[-0.05em] [text-shadow:0_0_80px_rgb(255_180_140/0.45)]">
              100<span className="text-ember-gradient">%</span>
            </span>
            <span className="mt-3 block text-[clamp(1.75rem,4.5vw,3.25rem)] leading-[1.02] tracking-[-0.02em]">
              of what you save should come back to you.
            </span>
          </h2>
          <p
            data-reveal
            style={{ "--reveal-delay": "160ms" } as React.CSSProperties}
            className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-sand/90 sm:text-lg"
          >
            That is the standard SaveIt.now is built for. Not a saved list you
            scroll and forget, but a library you can walk back into with one
            sentence. Save with confidence because rediscovery is the whole
            point.
          </p>
        </div>

        {/* Ask demo */}
        <div
          data-reveal="scale"
          style={{ "--reveal-delay": "220ms" } as React.CSSProperties}
          className="mx-auto mt-14 max-w-3xl"
        >
          <div className="rounded-[26px] border border-white/12 bg-ink/65 p-3 shadow-card backdrop-blur-2xl sm:p-4">
            <div
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/60 px-4 py-3.5"
              role="status"
              aria-label="Example question typed into SaveIt.now"
            >
              <SearchIcon className="size-4 shrink-0 text-ember-2" />
              <p className="min-h-6 flex-1 truncate text-left text-[15px] text-cream sm:text-base">
                {typed}
                {phase === "typing" && !reducedMotion ? (
                  <span className="anim-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-ember-2" />
                ) : null}
              </p>
              <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-dune sm:inline-block">
                Enter
              </kbd>
            </div>

            <div className="mt-3 min-h-[116px] px-1" aria-live="polite">
              {phase === "answer" ? (
                <div className="anim-rise flex items-start gap-3 rounded-2xl border border-ember/25 bg-gradient-to-br from-ember/[0.14] to-transparent p-4 text-left">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ember/20 text-ember-2">
                    <SparklesIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-medium tracking-[0.12em] text-blush uppercase">
                      {current.result.kind}
                    </p>
                    <p className="mt-1 text-[16px] leading-snug font-medium text-cream">
                      {current.result.title}
                    </p>
                    <p className="mt-1 text-[13px] text-dune">{current.result.meta}</p>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                    {current.result.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[12px] text-sand"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-4 text-[13.5px] text-dune">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-ember-2" />
                  </span>
                  {phase === "thinking"
                    ? "Looking through what you saved"
                    : "Ask the way you remember it"}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2 px-1 pb-1">
              {QUERIES.map((query, queryIndex) => (
                <button
                  key={query.prompt}
                  type="button"
                  aria-pressed={queryIndex === index}
                  onClick={() => {
                    setManual(true);
                    setIndex(queryIndex);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-left text-[12.5px] transition-colors ${
                    queryIndex === index
                      ? "border-ember/50 bg-ember/15 text-cream"
                      : "border-white/10 bg-white/[0.03] text-sand hover:border-white/25 hover:text-cream"
                  }`}
                >
                  {query.prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pillars */}
        <div className="mt-16 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {PILLARS.map((pillar, pillarIndex) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                data-reveal
                style={{ "--reveal-delay": `${pillarIndex * 90}ms` } as React.CSSProperties}
                className="rounded-2xl border border-white/10 bg-ink/55 p-6 backdrop-blur-xl"
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-ember-2">
                  <Icon className="size-[18px]" />
                </span>
                <h3 className="mt-5 text-[17px] leading-snug font-medium text-cream">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-sand/80">
                  {pillar.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
