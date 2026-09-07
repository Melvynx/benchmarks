import {
  CheckIcon,
  Loader2Icon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../lib/motion";

const DEMO_BOOKMARKS = [
  {
    title: "A Crash Course on Caching Fundamentals",
    domain: "swequiz.com",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/favicon.ico",
    preview:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/screenshot.jpg",
  },
  {
    title: "Database Fundamentals",
    domain: "tontinton.com",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/favicon.png",
    preview:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/screenshot.jpg",
  },
  {
    title: "Database School",
    domain: "databaseschool.com",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/favicon.png",
    preview:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/screenshot.jpg",
  },
];

type Step =
  | "idle"
  | "typing"
  | "sent"
  | "search-1"
  | "search-2"
  | "results"
  | "response";

export const AgentDemo = () => {
  const [step, setStep] = useState<Step>("idle");
  const [typed, setTyped] = useState("");
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const reducedMotion = useReducedMotion();
  const fullText = "All the database courses";

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;

    if (reducedMotion) {
      setStep("response");
      setTyped(fullText);
      return;
    }

    const add = (cb: () => void, ms: number) => {
      timers.current.push(window.setTimeout(cb, ms));
    };

    const run = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setStep("idle");
      setTyped("");

      add(() => {
        setStep("typing");
        let i = 0;
        const iv = window.setInterval(() => {
          i += 1;
          setTyped(fullText.slice(0, i));
          if (i >= fullText.length) {
            clearInterval(iv);
            add(() => setStep("sent"), 300);
          }
        }, 45);
        timers.current.push(iv);
      }, 900);

      add(() => setStep("search-1"), 2700);
      add(() => setStep("search-2"), 3700);
      add(() => setStep("results"), 4700);
      add(() => setStep("response"), 5700);
      add(() => run(), 13000);
    };

    run();
    return () => timers.current.forEach(clearTimeout);
  }, [inView, reducedMotion]);

  const showUser = step !== "idle";
  const showS1 = ["search-1", "search-2", "results", "response"].includes(step);
  const s1Done = ["search-2", "results", "response"].includes(step);
  const showS2 = ["search-2", "results", "response"].includes(step);
  const s2Done = ["results", "response"].includes(step);
  const showResults = ["results", "response"].includes(step);
  const showResponse = step === "response";

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-panel shadow-2xl shadow-black/50"
      role="img"
      aria-label="Animated demo: a user asks the SaveIt agent for their database courses and the agent searches their bookmarks, finds three matches, and offers to summarize them"
    >
      {/* Window bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-[#ff5f57]" />
            <div className="size-3 rounded-full bg-[#febc2e]" />
            <div className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="ml-3 flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-flare" />
            <span className="text-[13px] font-medium text-ink/90">
              SaveIt Agent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[#28c840]/15 px-2 py-0.5">
          <div className="size-1.5 rounded-full bg-[#28c840]" />
          <span className="text-[10px] font-medium text-[#28c840]">
            On duty
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div className="min-h-[320px] space-y-4 p-5 sm:min-h-[360px]">
        {showUser && (
          <div className="flex justify-end">
            <div className="max-w-[75%] rounded-2xl rounded-br-md bg-ember px-4 py-2.5">
              <p className="text-[14px] text-coal">
                {typed}
                {step === "typing" && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-coal/70" />
                )}
              </p>
            </div>
          </div>
        )}

        {showS1 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                {s1Done ? (
                  <CheckIcon className="size-3 text-[#28c840]" />
                ) : (
                  <SearchIcon className="size-3 animate-pulse text-flare" />
                )}
                <span className="text-[12px] text-dusk">database tutorials</span>
                {s1Done && (
                  <span className="text-[11px] text-haze">3 found</span>
                )}
              </div>
              {showS2 && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                  {s2Done ? (
                    <CheckIcon className="size-3 text-[#28c840]" />
                  ) : (
                    <SearchIcon className="size-3 animate-pulse text-flare" />
                  )}
                  <span className="text-[12px] text-dusk">SQL tools</span>
                  {s2Done && (
                    <span className="text-[11px] text-haze">2 found</span>
                  )}
                </div>
              )}
            </div>

            {!showResults && (
              <div className="flex items-center gap-2 py-2">
                <Loader2Icon className="size-3.5 animate-spin text-dusk" />
                <span className="text-[13px] text-dusk">
                  Searching your bookmarks...
                </span>
              </div>
            )}

            {showResults && (
              <div className="space-y-3">
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {DEMO_BOOKMARKS.map((b) => (
                    <div
                      key={b.title}
                      className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden bg-panel-2">
                        <img
                          src={b.preview}
                          alt=""
                          className="size-full object-cover opacity-90"
                          loading="lazy"
                        />
                      </div>
                      <div className="px-3 py-2.5">
                        <div className="mb-1 flex items-center gap-1.5">
                          <img
                            src={b.favicon}
                            alt=""
                            className="size-3.5 rounded-sm"
                            loading="lazy"
                          />
                          <span className="truncate text-[11px] text-haze">
                            {b.domain}
                          </span>
                        </div>
                        <p className="line-clamp-1 text-[13px] font-medium text-ink/90">
                          {b.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {showResponse && (
                  <div className="flex gap-2.5">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ember/20">
                      <SparklesIcon className="size-3 text-flare" />
                    </div>
                    <p className="pt-0.5 text-[14px] leading-relaxed text-ink/90">
                      I found 3 database resources in your bookmarks. Want me to
                      summarize any of these?
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
          <span className="text-[14px] text-haze">
            Ask about your bookmarks...
          </span>
        </div>
      </div>
    </div>
  );
};
