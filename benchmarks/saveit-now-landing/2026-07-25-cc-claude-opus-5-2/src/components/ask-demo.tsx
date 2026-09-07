import {
  CheckIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlayIcon,
  SparklesIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";

import { cx } from "../lib/cx";
import { useInView, usePrefersReducedMotion } from "../lib/motion";
import { Container, Eyebrow, Reveal } from "./ui";

type Kind = "article" | "video" | "post" | "image";

const KIND: Record<
  Kind,
  {
    label: string;
    Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    /** Thumbnail wash, drawn from the campaign palette. */
    wash: string;
  }
> = {
  article: {
    label: "Article",
    Icon: FileTextIcon,
    wash: "linear-gradient(140deg,#4a2c3f,#a8583c)",
  },
  video: {
    label: "Video",
    Icon: PlayIcon,
    wash: "linear-gradient(140deg,#3d2b4e,#c2673a)",
  },
  post: {
    label: "Post",
    Icon: MessageSquareIcon,
    wash: "linear-gradient(140deg,#33324f,#8b6fae)",
  },
  image: {
    label: "Image",
    Icon: ImageIcon,
    wash: "linear-gradient(140deg,#2f4038,#7ea86f)",
  },
};

type Result = {
  title: string;
  domain: string;
  kind: Kind;
  note: string;
};

/**
 * Each query is worded the way a person actually remembers something, and
 * deliberately shares almost no words with the results. That gap is the whole
 * argument: matching happens on meaning, not on keywords.
 */
const QUERIES: Array<{ query: string; answer: string; results: Result[] }> = [
  {
    query: "that pasta thing my friend sent me",
    answer:
      "Three saves match. The video came in from a message last month, which is probably the one you mean.",
    results: [
      {
        title: "One-Pan Tomato Butter Pasta",
        domain: "youtube.com",
        kind: "video",
        note: "20 minute weeknight recipe, four ingredients",
      },
      {
        title: "The Cacio e Pepe Method That Never Splits",
        domain: "seriouseats.com",
        kind: "article",
        note: "Technique piece on emulsifying pecorino",
      },
      {
        title: "Sauce trick worth stealing",
        domain: "x.com",
        kind: "post",
        note: "Short thread on finishing pasta in the pan",
      },
    ],
  },
  {
    query: "why small teams ship faster, I read it in spring",
    answer:
      "Two essays and a talk. All three argue the same point from different angles.",
    results: [
      {
        title: "The Cost of Coordination",
        domain: "every.to",
        kind: "article",
        note: "On how headcount adds communication overhead",
      },
      {
        title: "Small Teams, Short Loops",
        domain: "newsletter.pragmaticengineer.com",
        kind: "article",
        note: "Case studies on shipping cadence",
      },
      {
        title: "Shipping Culture",
        domain: "youtube.com",
        kind: "video",
        note: "Conference talk, 28 minutes",
      },
    ],
  },
  {
    query: "the moody gradient poster I liked",
    answer:
      "Saved as images, so they were indexed by what is in them rather than by any caption.",
    results: [
      {
        title: "Dusk gradient study, print series",
        domain: "dribbble.com",
        kind: "image",
        note: "Warm to violet, large format",
      },
      {
        title: "Editorial poster, layered light",
        domain: "are.na",
        kind: "image",
        note: "Collected into a visual reference block",
      },
      {
        title: "Colour and depth in print",
        domain: "itsnicethat.com",
        kind: "article",
        note: "Interview covering the same technique",
      },
    ],
  },
];

type Phase = "typing" | "searching" | "results";

export function AskDemo() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState("");
  /** Once the visitor picks a query, stop rotating and leave them in control. */
  const [manual, setManual] = useState(false);

  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const reduced = usePrefersReducedMotion();
  const timers = useRef<number[]>([]);

  const active = QUERIES[index];

  // Runs the type, search, answer sequence for the active query.
  useEffect(() => {
    if (!inView) return;

    const clearAll = () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
    clearAll();

    // Reduced motion gets the finished state, never a withheld one.
    if (reduced) {
      setTyped(active.query);
      setPhase("results");
      return;
    }

    setTyped("");
    setPhase("typing");

    const CHAR_MS = 38;
    for (let i = 1; i <= active.query.length; i++) {
      timers.current.push(
        window.setTimeout(() => setTyped(active.query.slice(0, i)), i * CHAR_MS),
      );
    }

    const typingDone = active.query.length * CHAR_MS;
    timers.current.push(
      window.setTimeout(() => setPhase("searching"), typingDone + 260),
    );
    timers.current.push(
      window.setTimeout(() => setPhase("results"), typingDone + 1500),
    );

    return clearAll;
  }, [active, inView, reduced]);

  // Rotate to the next query, unless the visitor has taken over.
  useEffect(() => {
    if (manual || reduced || !inView || phase !== "results") return;
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % QUERIES.length),
      5200,
    );
    return () => window.clearTimeout(timer);
  }, [manual, reduced, inView, phase]);

  const select = (next: number) => {
    setManual(true);
    setIndex(next);
  };

  return (
    <section
      aria-labelledby="ask-heading"
      className="relative py-24 sm:py-32 lg:py-40"
    >
      <Container>
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow tone="dusk">Rediscovery</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h2
              id="ask-heading"
              className="mt-7 text-balance font-display display-tight text-[clamp(2.5rem,6.2vw,4.5rem)] text-cream"
            >
              Ask badly.
              <br />
              <em className="not-italic text-ember-gradient">
                Find it anyway.
              </em>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-7 max-w-xl text-pretty leading-relaxed text-mist">
              You will not remember the title. You will remember that a friend
              sent it, that it was about pasta, and that it was a while ago.
              That is enough.
            </p>
          </Reveal>
        </div>

        <Reveal delay={80}>
          <div ref={ref} className="mt-14">
            {/* Query picker. Real buttons, so this works on keyboard. */}
            <div
              role="group"
              aria-label="Try an example question"
              className="flex flex-wrap gap-2"
            >
              {QUERIES.map((item, i) => (
                <button
                  key={item.query}
                  type="button"
                  onClick={() => select(i)}
                  aria-pressed={i === index}
                  className={cx(
                    "rounded-full border px-4 py-2 text-left text-[0.8125rem] transition-all duration-300",
                    i === index
                      ? "border-ember-500/50 bg-ember-500/12 text-cream"
                      : "border-line bg-ink-2 text-mist hover:border-line-2 hover:text-cream",
                  )}
                >
                  {item.query}
                </button>
              ))}
            </div>

            {/* Console */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-ink-2 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
                <SparklesIcon
                  className="size-4 text-ember-400"
                  aria-hidden="true"
                />
                <span className="text-[0.8125rem] font-medium text-cream">
                  Your library
                </span>
                <span className="ml-auto text-[0.75rem] text-haze">
                  Searching by meaning
                </span>
              </div>

              {/* The question */}
              <div className="border-b border-line px-5 py-5 sm:px-7">
                <div className="flex items-start gap-3">
                  <CornerDownLeftIcon
                    className="mt-1 size-4 shrink-0 rotate-180 text-haze"
                    aria-hidden="true"
                  />
                  <p className="text-[0.9375rem] text-cream sm:text-base">
                    {typed}
                    {phase === "typing" && (
                      <span
                        aria-hidden="true"
                        className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.15em] bg-ember-400 align-middle animate-caret"
                      />
                    )}
                  </p>
                </div>
              </div>

              {/* The answer. aria-live so the result is announced, not just
                  seen. The min-height is set above the tallest result set at
                  each breakpoint, so the panel never resizes between phases or
                  between queries and nothing below the demo ever jumps. */}
              <div
                aria-live="polite"
                aria-busy={phase !== "results"}
                className="min-h-[40rem] px-5 py-6 sm:min-h-[27rem] sm:px-7"
              >
                {phase !== "results" && (
                  // Skeleton in the reserved space, so the panel reads as a
                  // search in progress rather than an empty box.
                  <div aria-hidden="true">
                    <div className="flex items-center gap-2.5 text-[0.875rem] text-mist">
                      {phase === "searching" ? (
                        <>
                          <Loader2Icon className="size-4 animate-spin text-ember-400" />
                          Reading across everything you saved
                        </>
                      ) : (
                        <span className="text-haze">
                          Listening for your question
                        </span>
                      )}
                    </div>

                    <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[0, 1, 2].map((i) => (
                        <li
                          key={i}
                          className="flex gap-3.5 rounded-xl border border-line/70 bg-ink-3/50 p-3 motion-safe:animate-pulse sm:block sm:p-0"
                          style={{ animationDelay: `${i * 220}ms` }}
                        >
                          <div className="aspect-[16/10] w-[5.5rem] shrink-0 rounded-lg bg-line/70 sm:aspect-[16/9] sm:w-auto sm:rounded-none" />
                          <div className="min-w-0 flex-1 sm:p-4">
                            <div className="h-2 w-14 rounded-full bg-line/70" />
                            <div className="mt-3 h-2.5 w-4/5 rounded-full bg-line/60" />
                            <div className="mt-2.5 h-2 w-3/5 rounded-full bg-line/50" />
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Stands in for the summary line, so the reserved space
                        is accounted for top to bottom. */}
                    <div className="mt-5 flex gap-3 motion-safe:animate-pulse">
                      <span className="size-6 shrink-0 rounded-full bg-line/60" />
                      <div className="min-w-0 flex-1 pt-1.5">
                        <div className="h-2 w-full max-w-md rounded-full bg-line/50" />
                        <div className="mt-2.5 h-2 w-1/3 rounded-full bg-line/40" />
                      </div>
                    </div>
                  </div>
                )}

                {phase === "results" && (
                  <div>
                    <div className="flex items-center gap-2 text-[0.8125rem] text-moss">
                      <CheckIcon className="size-4" aria-hidden="true" />
                      {active.results.length} matches
                    </div>

                    <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                      {active.results.map((result, i) => {
                        const kind = KIND[result.kind];
                        return (
                          <li
                            key={result.title}
                            className="motion-safe:animate-rise"
                            style={{ animationDelay: `${i * 90}ms` }}
                          >
                            {/* Compact row on phones, stacked card from sm up.
                                The row keeps all three results on one screen
                                and keeps the panel a predictable height. */}
                            <div className="group flex h-full gap-3.5 overflow-hidden rounded-xl border border-line bg-ink-3 p-3 transition-colors duration-300 hover:border-line-2 sm:block sm:p-0">
                              <div
                                className="relative flex aspect-[16/10] w-[5.5rem] shrink-0 items-end overflow-hidden rounded-lg sm:aspect-[16/9] sm:w-auto sm:rounded-none sm:p-3"
                                style={{ background: kind.wash }}
                              >
                                <div
                                  aria-hidden="true"
                                  className="absolute inset-0 bg-[radial-gradient(90%_70%_at_70%_20%,rgba(255,243,226,0.28),transparent_70%)]"
                                />
                                <span className="relative hidden items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 text-[0.6875rem] font-medium text-cream backdrop-blur-sm sm:inline-flex">
                                  <kind.Icon
                                    className="size-3"
                                    aria-hidden={true}
                                  />
                                  {kind.label}
                                </span>
                              </div>

                              <div className="min-w-0 sm:p-4">
                                <p className="flex items-center gap-1.5 text-[0.6875rem] text-haze">
                                  {/* The kind badge has nowhere to sit on the
                                      small thumbnail, so it joins the domain. */}
                                  <kind.Icon
                                    className="size-3 shrink-0 sm:hidden"
                                    aria-hidden={true}
                                  />
                                  <span className="sm:hidden">
                                    {kind.label}
                                  </span>
                                  <span aria-hidden="true" className="sm:hidden">
                                    ·
                                  </span>
                                  <span className="truncate">
                                    {result.domain}
                                  </span>
                                </p>
                                <h3 className="mt-1 text-[0.875rem] font-medium leading-snug text-cream sm:mt-1.5">
                                  {result.title}
                                </h3>
                                <p className="mt-1.5 text-[0.75rem] leading-relaxed text-mist sm:mt-2">
                                  {result.note}
                                </p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <div
                      className="mt-5 flex gap-3 motion-safe:animate-rise"
                      style={{ animationDelay: "300ms" }}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ember-500/20">
                        <SparklesIcon
                          className="size-3 text-ember-300"
                          aria-hidden="true"
                        />
                      </span>
                      <p className="text-[0.875rem] leading-relaxed text-mist">
                        {active.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 text-[0.75rem] text-haze">
              Illustration of a search. Content shown is an example library.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
