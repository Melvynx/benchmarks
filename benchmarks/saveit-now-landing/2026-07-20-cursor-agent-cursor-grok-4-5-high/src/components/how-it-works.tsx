import { useEffect, useRef, useState } from "react";
import { Reveal } from "./reveal";

const steps = [
  {
    title: "You save",
    copy: "Hit save from the browser, share sheet, or iOS app. That is the whole job on your side.",
    image: "/images/landing-v2/portal-arch.png",
    alt: "A glowing arched portal on a flowered hill, the moment a link crosses into SaveIt",
  },
  {
    title: "We understand",
    copy: "The agent reads the page, names it, tags it, and places it with related saves. No manual filing.",
    image: "/images/landing-v2/portal-rocks.png",
    alt: "A pale glowing portal framed by warm rocks and moss, clarity forming around what you saved",
  },
];

const DEMO_RESULTS = [
  { title: "Caching fundamentals", domain: "swequiz.com" },
  { title: "Database School", domain: "databaseschool.com" },
  { title: "SQL mental models", domain: "tontinton.com" },
];

function AskDemo() {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"idle" | "typing" | "results">("idle");
  const full = "that database course I saved last week";
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clear = () => timers.current.forEach((t) => window.clearTimeout(t));
    const add = (fn: () => void, ms: number) => {
      timers.current.push(window.setTimeout(fn, ms));
    };

    const run = () => {
      clear();
      setTyped("");
      setPhase("idle");
      if (reduced) {
        setTyped(full);
        setPhase("results");
        return;
      }
      add(() => {
        setPhase("typing");
        let i = 0;
        const tick = () => {
          if (i < full.length) {
            setTyped(full.slice(0, i + 1));
            i += 1;
            timers.current.push(window.setTimeout(tick, 38));
          } else {
            add(() => setPhase("results"), 450);
          }
        };
        tick();
      }, 600);
      add(() => run(), 9000);
    };

    run();
    return clear;
  }, []);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-line bg-bg shadow-[0_30px_80px_-40px_rgba(42,33,28,0.45)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="size-2 rounded-full bg-ember" aria-hidden="true" />
        <span className="text-[13px] font-medium text-ink">Ask SaveIt</span>
      </div>
      <div className="min-h-[17rem] space-y-4 p-5 sm:min-h-[19rem]">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ember px-4 py-2.5 text-[14px] text-on-dark">
            {typed}
            {phase === "typing" ? (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-white/70" />
            ) : null}
          </div>
        </div>
        {phase === "results" ? (
          <div className="space-y-2">
            {DEMO_RESULTS.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-medium text-ink">{item.title}</p>
                  <p className="text-[12px] text-muted">{item.domain}</p>
                </div>
                <span className="text-[11px] tracking-wide text-ember uppercase">
                  Open
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="bg-bg px-6 py-[clamp(4.5rem,10vw,8rem)]">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-[13px] font-medium tracking-[0.16em] text-ember uppercase">
            Just save it
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-balance text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">
            Agentic bookmarking means you stop organizing
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            Traditional bookmark managers ask you to file everything. SaveIt
            turns a single save into capture, understanding, categorization,
            and retrieval so the link is ready when you need it.
          </p>
        </Reveal>

        <ol className="mt-16 space-y-20 lg:mt-20 lg:space-y-28">
          {steps.map((step, index) => {
            const reverse = index % 2 === 1;
            return (
              <Reveal key={step.title} as="li" delayMs={index * 60}>
                <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                  <div
                    className={`lg:col-span-5 ${
                      reverse ? "lg:order-2" : "lg:order-1"
                    }`}
                  >
                    <span className="font-display text-sm font-semibold tracking-tight text-ember tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-display mt-3 text-balance text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted">
                      {step.copy}
                    </p>
                  </div>
                  <div
                    className={`lg:col-span-7 ${
                      reverse ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <div className="overflow-hidden rounded-[1.5rem] bg-surface p-1.5 shadow-[0_30px_80px_-40px_rgba(42,33,28,0.55)]">
                      <img
                        src={step.image}
                        alt={step.alt}
                        className="img-edge aspect-[16/9] w-full rounded-[calc(1.5rem-0.375rem)] object-cover"
                        width={3272}
                        height={1834}
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}

          <Reveal as="li" delayMs={120}>
            <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <span className="font-display text-sm font-semibold tracking-tight text-ember tabular-nums">
                  03
                </span>
                <h3 className="font-display mt-3 text-balance text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
                  You ask
                </h3>
                <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted">
                  Search in plain language or browse by meaning. What you saved
                  comes back ready to use, not buried in a folder you forgot.
                </p>
              </div>
              <div className="lg:col-span-7">
                <AskDemo />
              </div>
            </div>
          </Reveal>
        </ol>
      </div>
    </section>
  );
}
