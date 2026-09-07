import {
  CheckIcon,
  FolderTreeIcon,
  LinkIcon,
  SparklesIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useReducedMotion } from "../lib/use-reduced-motion";

const URL_TEXT = "https://tontinton.com/posts/database-fundamentals/";

const stages = [
  { id: "captured", label: "Captured", icon: LinkIcon },
  { id: "understood", label: "Understood", icon: SparklesIcon },
  { id: "organized", label: "Organized", icon: FolderTreeIcon },
] as const;

type Phase = "idle" | "typing" | "captured" | "understood" | "organized" | "done";

const PHASE_ORDER: Phase[] = [
  "idle",
  "typing",
  "captured",
  "understood",
  "organized",
  "done",
];

const stageReached = (phase: Phase, stage: Phase) =>
  PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(stage);

/**
 * A looping simulation of the only thing a user does: paste a link.
 * Everything after the paste is handled by the agent.
 */
export function SaveDemo() {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reducedMotion ? "done" : "idle");
  const [typed, setTyped] = useState(reducedMotion ? URL_TEXT : "");

  useEffect(() => {
    if (reducedMotion) {
      setPhase("done");
      setTyped(URL_TEXT);
      return;
    }

    const timers: number[] = [];
    const at = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, ms));

    const run = () => {
      timers.splice(0).forEach(window.clearTimeout);
      setPhase("idle");
      setTyped("");

      at(700, () => {
        setPhase("typing");
        let i = 0;
        const step = () => {
          i += 3;
          setTyped(URL_TEXT.slice(0, i));
          if (i < URL_TEXT.length) at(24, step);
        };
        step();
      });
      at(1700, () => setPhase("captured"));
      at(2600, () => setPhase("understood"));
      at(3500, () => setPhase("organized"));
      at(4300, () => setPhase("done"));
      at(10500, run);
    };

    run();
    return () => timers.forEach(window.clearTimeout);
  }, [reducedMotion]);

  const done = phase === "done";

  return (
    <div
      className="glass relative w-full overflow-hidden rounded-3xl p-2 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]"
      aria-live="polite"
    >
      <div className="rounded-[20px] bg-ink/70 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-dim">
          <span className="inline-block size-1.5 rounded-full bg-ember" />
          The only step you do
        </div>

        <div className="mt-3 flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4">
          <LinkIcon className="size-4 shrink-0 text-ember-soft" aria-hidden />
          <p className="min-w-0 flex-1 truncate font-mono text-[13px] text-cream/90">
            {typed || (
              <span className="text-dim">Paste any link and press enter</span>
            )}
            {phase === "typing" && (
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-pulse bg-ember-soft" />
            )}
          </p>
          <span
            className={`inline-flex h-7 items-center rounded-full px-3 text-[12px] font-medium transition-colors ${
              stageReached(phase, "captured")
                ? "bg-ember text-ink"
                : "bg-white/[0.06] text-dim"
            }`}
          >
            {stageReached(phase, "captured") ? "Saved" : "Save it"}
          </span>
        </div>

        <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="What the agent does">
          {stages.map((stage) => {
            const reached = stageReached(phase, stage.id);
            const Icon = stage.icon;
            return (
              <li
                key={stage.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] transition-all duration-500 ${
                  reached
                    ? "border-ember/40 bg-ember/10 text-cream"
                    : "border-white/[0.06] text-dim"
                }`}
              >
                <span
                  className={`relative inline-flex size-5 shrink-0 items-center justify-center rounded-full ${
                    reached ? "bg-ember text-ink" : "bg-white/[0.06]"
                  } ${reached && !done ? "pulse-ring text-ember" : ""}`}
                >
                  {reached ? (
                    <CheckIcon className="size-3" aria-hidden />
                  ) : (
                    <Icon className="size-3" aria-hidden />
                  )}
                </span>
                <span className="truncate">{stage.label}</span>
              </li>
            );
          })}
        </ol>

        <div
          className={`mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            done ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
          aria-hidden={!done}
        >
          <div className="flex gap-4 p-4">
            <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-lilac/40 via-rose/30 to-ember/40 sm:block">
              <div className="m-2 h-2 w-16 rounded bg-white/50" />
              <div className="mx-2 h-1.5 w-20 rounded bg-white/30" />
              <div className="mx-2 mt-1 h-1.5 w-12 rounded bg-white/30" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] text-dim">
                <span className="truncate">tontinton.com</span>
                <span className="text-white/20">/</span>
                <span className="text-ember-soft">Article</span>
              </p>
              <p className="mt-1 truncate text-[14px] font-medium text-cream">
                Database Fundamentals
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-mist">
                A long form walk through storage engines, indexes, and
                transactions, written for engineers who want the mental model.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["databases", "engineering", "learning"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-cream/80"
                  >
                    {tag}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full bg-ember/15 px-2 py-0.5 text-[11px] text-ember-soft">
                  <WandSparklesIcon className="size-3" aria-hidden />
                  filed by the agent
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
