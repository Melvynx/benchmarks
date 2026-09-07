import {
  BookmarkPlusIcon,
  BrainIcon,
  CheckIcon,
  LayersIcon,
  MessageSquareTextIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { images } from "../lib/images";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { CampaignPicture } from "./campaign-image";
import { SectionHeading } from "./section-heading";

const STEP_DURATION = 3400;

const STEPS = [
  {
    id: "save",
    icon: BookmarkPlusIcon,
    label: "You save",
    title: "One click. That is your whole job.",
    body: "Hit the extension on any page, video, thread, or PDF, or share it from your iPhone. No form, no folder picker, no title to write.",
  },
  {
    id: "understand",
    icon: BrainIcon,
    label: "The agent reads",
    title: "It reads the whole thing, not just the URL.",
    body: "The agent opens what you saved and works out what it is actually about, who it is for, and why you might want it later.",
  },
  {
    id: "organize",
    icon: LayersIcon,
    label: "The agent files",
    title: "Title, summary, tags, and context, filled in for you.",
    body: "Everything lands organized without you touching it. Your library stays clean whether you save one link a week or fifty a day.",
  },
  {
    id: "retrieve",
    icon: MessageSquareTextIcon,
    label: "You ask",
    title: "Ask in plain words. Get the exact save back.",
    body: "\"That pricing article from last month\" is a valid search. The agent looks through meaning, not just keywords, and hands it back.",
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STEP_INDEX: Record<StepId, number> = {
  save: 0,
  understand: 1,
  organize: 2,
  retrieve: 3,
};

export const WorkflowSection = () => {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState<StepId>("save");
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (pinned || reducedMotion) return;
    const timer = setInterval(() => {
      setActive((current) => {
        const next = (STEP_INDEX[current] + 1) % STEPS.length;
        return STEPS[next].id;
      });
    }, STEP_DURATION);
    return () => clearInterval(timer);
  }, [pinned, reducedMotion]);

  const activeIndex = STEP_INDEX[active];

  return (
    <section
      id="workflow"
      className="relative scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32"
      aria-labelledby="workflow-title"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="workflow-title"
          eyebrow="The agentic workflow"
          title={
            <>
              You do one thing. <em className="text-ember-gradient">Save it.</em>
              <br className="hidden sm:block" /> The agent does the rest.
            </>
          }
          description="Bookmark managers made you the librarian. SaveIt.now puts an agent on the job instead. Capture, understanding, filing, and retrieval happen for you, every time you save."
        />

        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          {/* Steps */}
          <ol
            className="flex flex-col gap-2"
            aria-label="How SaveIt.now handles a save"
          >
            {STEPS.map((step, index) => {
              const isActive = step.id === active;
              const Icon = step.icon;
              return (
                <li
                  key={step.id}
                  data-reveal
                  style={{ "--reveal-delay": `${index * 70}ms` } as React.CSSProperties}
                >
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setActive(step.id);
                      setPinned(true);
                    }}
                    className={`group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-[border-color,background-color] duration-500 ${
                      isActive
                        ? "border-ember/40 bg-gradient-to-br from-ember/[0.12] to-white/[0.02]"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-500 ${
                          isActive
                            ? "border-ember/50 bg-ember/20 text-ember-2"
                            : "border-white/10 bg-white/[0.04] text-dune group-hover:text-sand"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-[11.5px] font-medium tracking-[0.12em] text-dune uppercase">
                          <span className="tabular-nums">0{index + 1}</span>
                          <span className="h-px w-3 bg-current opacity-60" aria-hidden />
                          {step.label}
                        </p>
                        <h3
                          className={`mt-1.5 text-[17px] leading-snug font-medium tracking-[-0.01em] transition-colors duration-500 ${
                            isActive ? "text-cream" : "text-sand"
                          }`}
                        >
                          {step.title}
                        </h3>
                        <div
                          className="accordion-panel"
                          data-open={isActive}
                        >
                          <div>
                            <p className="pt-2 text-[14.5px] leading-relaxed text-sand/80">
                              {step.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isActive && !pinned && !reducedMotion ? (
                      <span
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-ember to-blush anim-progress"
                        style={{ "--duration": `${STEP_DURATION}ms` } as React.CSSProperties}
                        key={active}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Stage */}
          <div
            data-reveal="scale"
            className="relative min-h-[600px] overflow-hidden rounded-[28px] border border-white/10 shadow-card sm:min-h-[560px]"
          >
            <CampaignPicture
              image={images.observatory}
              className="absolute inset-0"
              imgClassName="object-[62%_50%]"
              sizes="(min-width: 1024px) 60vw, 100vw"
              decorative
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-ink/50 to-transparent"
            />

            <div className="absolute inset-x-5 top-5 flex items-center justify-between text-[12px] text-sand/80 sm:inset-x-7 sm:top-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink/50 px-3 py-1.5 backdrop-blur-md">
                <SparklesIcon className="size-3.5 text-ember-2" />
                SaveIt agent
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink/50 px-3 py-1.5 tabular-nums backdrop-blur-md">
                <span
                  className={`size-1.5 rounded-full ${
                    activeIndex === 3 ? "bg-emerald-400" : "bg-ember animate-pulse"
                  }`}
                />
                {activeIndex === 3 ? "Ready" : "Working"}
              </span>
            </div>

            <CaptureCard step={activeIndex} />
          </div>
        </div>
      </div>
    </section>
  );
};

const CAPTURE = {
  url: "stripe.com/blog/pricing-experiments",
  title: "What we learned running 40 pricing experiments",
  summary:
    "A field guide to price testing for SaaS teams: how to structure experiments, what to measure, and which surprising results changed the way Stripe thinks about tiers.",
  tags: ["Pricing", "SaaS", "Experiments", "Growth"],
  question: "that pricing article from last month",
};

function CaptureCard({ step }: { step: number }) {
  const saved = step >= 0;
  const understood = step >= 1;
  const organized = step >= 2;
  const retrieved = step >= 3;

  return (
    <div className="absolute inset-x-4 bottom-4 sm:inset-x-7 sm:bottom-7">
      {retrieved ? (
        <div className="anim-rise mb-3 flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-cream px-4 py-2.5 text-[14px] text-ink shadow-lg">
            Find {CAPTURE.question}
          </div>
        </div>
      ) : null}

      <div
        className="rounded-2xl border border-white/12 bg-ink/70 p-4 shadow-card backdrop-blur-xl sm:p-5"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5 text-[12.5px] text-dune">
          <span className="flex size-5 items-center justify-center rounded-md bg-[#635bff] text-[10px] font-bold text-white">
            S
          </span>
          <span className="truncate">{CAPTURE.url}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-emerald-300">
            <CheckIcon className="size-3.5" />
            Saved
          </span>
        </div>

        <div className="mt-4">
          {understood ? (
            <h4 className="anim-rise text-[17px] leading-snug font-medium text-cream sm:text-[18px]">
              {CAPTURE.title}
            </h4>
          ) : (
            <div className="space-y-2" aria-hidden>
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          )}
        </div>

        <div className="mt-3">
          {understood ? (
            <p
              className="anim-rise text-[13.5px] leading-relaxed text-sand/85"
              style={{ "--delay": "120ms" } as React.CSSProperties}
            >
              {CAPTURE.summary}
            </p>
          ) : (
            <div className="space-y-2" aria-hidden>
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-11/12 rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {organized ? (
            CAPTURE.tags.map((tag, index) => (
              <span
                key={tag}
                className="anim-rise rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 text-[12px] font-medium text-blush"
                style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}
              >
                {tag}
              </span>
            ))
          ) : (
            <>
              <div className="skeleton h-6 w-16 rounded-full" aria-hidden />
              <div className="skeleton h-6 w-12 rounded-full" aria-hidden />
              <div className="skeleton h-6 w-20 rounded-full" aria-hidden />
            </>
          )}
          <span className="ml-auto text-[12px] text-dune">
            {retrieved
              ? "Found in your library"
              : organized
                ? "Filed automatically"
                : understood
                  ? "Reading the page"
                  : saved
                    ? "Capturing"
                    : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
