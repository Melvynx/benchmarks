import {
  BrainCircuitIcon,
  FolderTreeIcon,
  MessageSquareTextIcon,
  MousePointerClickIcon,
} from "lucide-react";
import { useState } from "react";

import { campaignImages } from "../lib/campaign-images";
import { useIntervalSequence } from "../lib/use-interval-sequence";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { CampaignPicture } from "./ui/campaign-picture";
import { Reveal } from "./ui/reveal";

const steps = [
  {
    id: "save",
    icon: MousePointerClickIcon,
    kicker: "You do this",
    title: "Save it",
    body: "One tap from the browser extension, the iOS share sheet, or the web app. That is your whole job.",
    card: {
      label: "Saved",
      lines: ["Article", "swequiz.com", "A crash course on caching"],
    },
  },
  {
    id: "understand",
    icon: BrainCircuitIcon,
    kicker: "The agent does this",
    title: "It reads it",
    body: "A screenshot, the full text, and a summary are captured. The agent understands what the page is about, not just its title.",
    card: {
      label: "Understood",
      lines: [
        "Explains cache invalidation and TTLs",
        "Beginner friendly, 9 minute read",
        "Related to 4 saves about backend",
      ],
    },
  },
  {
    id: "organize",
    icon: FolderTreeIcon,
    kicker: "The agent does this",
    title: "It files it",
    body: "No folders to pick, no tags to type. Categories and tags are assigned for you and improve as you keep saving.",
    card: {
      label: "Organized",
      lines: ["Engineering / Backend", "#caching  #performance", "Grouped with 4 similar saves"],
    },
  },
  {
    id: "retrieve",
    icon: MessageSquareTextIcon,
    kicker: "You do this, whenever",
    title: "Ask for it back",
    body: "Search by what you remember, or ask a question in plain words. The agent searches meaning, not just keywords.",
    card: {
      label: "Found",
      lines: [
        "\"that caching article for beginners\"",
        "A crash course on caching",
        "Saved 3 weeks ago",
      ],
    },
  },
] as const;

const STEP_MS = 4200;

export function WorkflowSection() {
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const { index, progress, jumpTo } = useIntervalSequence({
    count: steps.length,
    stepMs: STEP_MS,
    enabled: !reducedMotion,
    paused,
  });
  const active = steps[index];

  return (
    <section
      id="how-it-works"
      className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div>
          <Reveal as="p" className="section-eyebrow">
            Agentic bookmarking
          </Reveal>
          <Reveal
            as="h2"
            delay={80}
            className="font-display mt-5 text-4xl leading-[1.02] text-cream sm:text-5xl lg:text-[3.6rem]"
          >
            You save. <em className="text-ember-soft">The agent does the rest.</em>
          </Reveal>
          <Reveal
            as="p"
            delay={160}
            className="mt-5 max-w-md text-[16px] leading-relaxed text-mist"
          >
            Folders you never open. Tabs you never close. Reading lists you
            never read. The problem was never saving. It was the filing. So
            SaveIt.now removes the filing.
          </Reveal>

          <div
            className="mt-10"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <ol className="space-y-1" aria-label="How SaveIt.now works">
              {steps.map((step, stepIndex) => {
                const isActive = stepIndex === index;
                const Icon = step.icon;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => jumpTo(stepIndex)}
                      aria-current={isActive ? "step" : undefined}
                      className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-4 text-left transition-colors duration-300 ${
                        isActive
                          ? "border-white/15 bg-white/[0.05]"
                          : "border-transparent hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isActive
                              ? "border-ember/50 bg-ember/15 text-ember-soft"
                              : "border-white/10 text-dim"
                          }`}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] uppercase tracking-[0.18em] text-dim">
                            {step.kicker}
                          </span>
                          <span
                            className={`mt-1 block text-[17px] font-medium ${
                              isActive ? "text-cream" : "text-cream/80"
                            }`}
                          >
                            {step.title}
                          </span>
                          <span
                            className={`accordion-panel mt-1 block text-[14px] leading-relaxed text-mist`}
                            data-open={isActive}
                          >
                            <span className="block">{step.body}</span>
                          </span>
                        </span>
                      </div>
                      {isActive && !reducedMotion && (
                        <span
                          className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.06]"
                          aria-hidden
                        >
                          <span
                            className="progress-fill block h-full bg-ember"
                            style={{ "--progress": progress } as React.CSSProperties}
                          />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <Reveal
          variant="scale"
          delay={120}
          className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-white/10 lg:min-h-0"
        >
          <CampaignPicture
            image={campaignImages.observatory}
            sizes="(min-width: 1024px) 560px, 100vw"
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
          <div className="absolute inset-x-0 top-0 p-5 sm:p-6">
            <p className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] text-cream/90">
              <span className="size-1.5 rounded-full bg-ember" />
              Always watching over what you saved
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <div
              key={active.id}
              className="glass rounded-2xl p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] motion-safe:animate-[fade-up_0.5s_cubic-bezier(0.16,1,0.3,1)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ember-soft">
                  <active.icon className="size-3.5" aria-hidden />
                  {active.card.label}
                </span>
                <span className="text-[11px] text-dim">
                  Step {index + 1} of {steps.length}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {active.card.lines.map((line, lineIndex) => (
                  <li
                    key={line}
                    className={`text-[14px] ${
                      lineIndex === 0 ? "text-cream" : "text-mist"
                    }`}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
