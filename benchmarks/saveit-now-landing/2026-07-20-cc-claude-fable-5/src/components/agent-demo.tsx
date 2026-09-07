import { CheckIcon, Loader2Icon, SearchIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const fullText = "All the database courses";
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      setStep("response");
      setTyped(fullText);
      return;
    }

    const add = (cb: () => void, ms: number) => {
      const t = setTimeout(cb, ms);
      timers.current.push(t);
    };

    const run = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setStep("idle");
      setTyped("");

      add(() => {
        setStep("typing");
        let i = 0;
        const iv = setInterval(() => {
          if (i < fullText.length) {
            setTyped(fullText.slice(0, i + 1));
            i++;
          } else {
            clearInterval(iv);
            add(() => setStep("sent"), 300);
          }
        }, 45);
        timers.current.push(iv as unknown as ReturnType<typeof setTimeout>);
      }, 1000);

      add(() => setStep("search-1"), 2800);
      add(() => setStep("search-2"), 3800);
      add(() => setStep("results"), 4800);
      add(() => setStep("response"), 5800);
      add(() => run(), 14000);
    };

    run();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const showUser = step !== "idle";
  const showS1 = ["search-1", "search-2", "results", "response"].includes(step);
  const s1Done = ["search-2", "results", "response"].includes(step);
  const showS2 = ["search-2", "results", "response"].includes(step);
  const s2Done = ["results", "response"].includes(step);
  const showResults = ["results", "response"].includes(step);
  const showResponse = step === "response";

  return (
    <div id="demo" className="scroll-mt-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-display text-2xl italic text-ember-soft sm:text-3xl">
          Watch a real ask
        </p>
        <p className="mt-3 text-[15px] text-cream/60">
          This is the retrieval side of the promise. Plain words in, your saves
          back out.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border border-cream/10 bg-ink-soft shadow-[0_40px_80px_-40px_rgba(255,122,69,0.15)]">
        {/* Window bar */}
        <div className="flex items-center justify-between border-b border-cream/[0.06] px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <div className="size-3 rounded-full bg-cream/15" />
              <div className="size-3 rounded-full bg-cream/15" />
              <div className="size-3 rounded-full bg-cream/15" />
            </div>
            <div className="ml-3 flex items-center gap-1.5">
              <SparklesIcon className="size-3.5 text-ember" aria-hidden="true" />
              <span className="text-[13px] font-medium text-cream/80">
                SaveIt Agent
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-ember/10 px-2.5 py-0.5">
            <div className="size-1.5 rounded-full bg-ember" aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-wide text-ember-soft uppercase">
              Live
            </span>
          </div>
        </div>

        {/* Chat area */}
        <div className="min-h-[320px] space-y-4 p-5 sm:min-h-[380px] sm:p-6">
          {showUser && (
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-br-md bg-ember px-4 py-2.5">
                <p className="text-[14px] font-medium text-ink">
                  {typed}
                  {step === "typing" && (
                    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-ink/70 align-middle" />
                  )}
                </p>
              </div>
            </div>
          )}

          {showS1 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-cream/[0.08] bg-cream/[0.04] px-3 py-1">
                  {s1Done ? (
                    <CheckIcon className="size-3 text-ember" aria-hidden="true" />
                  ) : (
                    <SearchIcon
                      className="size-3 animate-pulse text-ember-soft"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-[12px] text-cream/60">
                    database tutorials
                  </span>
                  {s1Done && (
                    <span className="text-[11px] text-cream/35">3 found</span>
                  )}
                </div>
                {showS2 && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-cream/[0.08] bg-cream/[0.04] px-3 py-1">
                    {s2Done ? (
                      <CheckIcon
                        className="size-3 text-ember"
                        aria-hidden="true"
                      />
                    ) : (
                      <SearchIcon
                        className="size-3 animate-pulse text-ember-soft"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-[12px] text-cream/60">SQL tools</span>
                    {s2Done && (
                      <span className="text-[11px] text-cream/35">2 found</span>
                    )}
                  </div>
                )}
              </div>

              {!showResults && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2Icon
                    className="size-3.5 animate-spin text-cream/50"
                    aria-hidden="true"
                  />
                  <span className="text-[13px] text-cream/50">
                    Searching your bookmarks...
                  </span>
                </div>
              )}

              {showResults && (
                <div className="space-y-3">
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {DEMO_BOOKMARKS.map((bookmark) => (
                      <div
                        key={bookmark.title}
                        className="overflow-hidden rounded-xl border border-cream/[0.08] bg-cream/[0.03] transition-colors hover:bg-cream/[0.06]"
                      >
                        <div className="aspect-[16/10] w-full overflow-hidden bg-ink-card">
                          <img
                            src={bookmark.preview}
                            alt={bookmark.title}
                            className="size-full object-cover opacity-90"
                            loading="lazy"
                          />
                        </div>
                        <div className="px-3 py-2.5">
                          <div className="mb-1 flex items-center gap-1.5">
                            <img
                              src={bookmark.favicon}
                              alt=""
                              className="size-3.5 rounded-sm"
                              loading="lazy"
                            />
                            <span className="truncate text-[11px] text-cream/40">
                              {bookmark.domain}
                            </span>
                          </div>
                          <p className="line-clamp-1 text-[13px] font-medium text-cream/85">
                            {bookmark.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showResponse && (
                    <div className="flex gap-2.5">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ember/15">
                        <SparklesIcon
                          className="size-3 text-ember"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="pt-0.5 text-[14px] leading-relaxed text-cream/80">
                        I found 3 database resources in your bookmarks. Want me
                        to summarize any of these?
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-cream/[0.06] px-5 py-3">
          <div className="flex items-center gap-3 rounded-xl border border-cream/[0.08] bg-cream/[0.03] px-4 py-2.5">
            <span className="text-[14px] text-cream/40">
              Ask about your bookmarks...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
