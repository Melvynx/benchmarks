import { CheckIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../lib/use-reduced-motion";

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

const FULL_TEXT = "All the database courses";

export function AskDemo() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>(reduced ? "response" : "idle");
  const [typed, setTyped] = useState(reduced ? FULL_TEXT : "");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduced) {
      setStep("response");
      setTyped(FULL_TEXT);
      return;
    }

    const add = (cb: () => void, ms: number) => {
      const t = window.setTimeout(cb, ms);
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
        const iv = window.setInterval(() => {
          if (i < FULL_TEXT.length) {
            setTyped(FULL_TEXT.slice(0, i + 1));
            i += 1;
          } else {
            clearInterval(iv);
            add(() => setStep("sent"), 300);
          }
        }, 45);
        timers.current.push(iv);
      }, 800);

      add(() => setStep("search-1"), 2600);
      add(() => setStep("search-2"), 3600);
      add(() => setStep("results"), 4600);
      add(() => setStep("response"), 5600);
      add(() => run(), 12800);
    };

    run();
    return () => timers.current.forEach(clearTimeout);
  }, [reduced]);

  const showUser = step !== "idle";
  const showS1 = ["search-1", "search-2", "results", "response"].includes(step);
  const s1Done = ["search-2", "results", "response"].includes(step);
  const showS2 = ["search-2", "results", "response"].includes(step);
  const s2Done = ["results", "response"].includes(step);
  const showResults = ["results", "response"].includes(step);
  const showResponse = step === "response";

  return (
    <div
      id="demo"
      className="portal-frame overflow-hidden rounded-2xl bg-panel"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-sm font-medium text-ink">Ask your library</p>
        <span className="rounded-full bg-moss/15 px-2.5 py-0.5 text-[11px] font-medium text-moss">
          Live demo
        </span>
      </div>

      <div className="min-h-[300px] space-y-4 p-5 sm:min-h-[340px]">
        {showUser ? (
          <div className="flex justify-end">
            <p className="max-w-[75%] rounded-2xl rounded-br-md bg-moss px-4 py-2.5 text-sm text-ink">
              {typed}
              {step === "typing" ? (
                <span className="ml-0.5 inline-block h-4 w-[2px] bg-ink/70" />
              ) : null}
            </p>
          </div>
        ) : null}

        {showS1 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusPill
                done={s1Done}
                label="database tutorials"
                found={s1Done ? "3 found" : undefined}
              />
              {showS2 ? (
                <StatusPill
                  done={s2Done}
                  label="SQL tools"
                  found={s2Done ? "2 found" : undefined}
                />
              ) : null}
            </div>

            {!showResults ? (
              <div className="flex items-center gap-2 py-1 text-sm text-mute">
                <Loader2Icon className="size-3.5 animate-spin" />
                Searching your bookmarks
              </div>
            ) : null}

            {showResults ? (
              <div className="grid gap-2.5 sm:grid-cols-3">
                {DEMO_BOOKMARKS.map((bookmark) => (
                  <article
                    key={bookmark.title}
                    className="overflow-hidden rounded-xl border border-line bg-canvas"
                  >
                    <img
                      src={bookmark.preview}
                      alt=""
                      className="aspect-[16/10] w-full object-cover"
                      loading="lazy"
                    />
                    <div className="px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-1.5">
                        <img
                          src={bookmark.favicon}
                          alt=""
                          className="size-3.5 rounded-sm"
                          loading="lazy"
                        />
                        <span className="truncate text-[11px] text-mute">
                          {bookmark.domain}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-[13px] font-medium text-ink">
                        {bookmark.title}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {showResponse ? (
              <p className="text-sm leading-relaxed text-ink/90">
                Three database resources from your saves. Ask for a summary of
                any of them.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-line px-5 py-3">
        <p className="rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-mute">
          Ask about your bookmarks
        </p>
      </div>
    </div>
  );
}

function StatusPill({
  done,
  label,
  found,
}: {
  done: boolean;
  label: string;
  found?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1">
      {done ? (
        <CheckIcon className="size-3 text-moss" />
      ) : (
        <SearchIcon className="size-3 text-ember" />
      )}
      <span className="text-[12px] text-mute">{label}</span>
      {found ? <span className="text-[11px] text-mute/80">{found}</span> : null}
    </div>
  );
}
