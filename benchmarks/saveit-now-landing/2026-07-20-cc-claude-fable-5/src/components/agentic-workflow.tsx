import { BookmarkPlusIcon, MessageCircleIcon, WandSparklesIcon } from "lucide-react";

import { AgentDemo } from "./agent-demo";
import { Reveal } from "./reveal";

const STEPS = [
  {
    number: "01",
    icon: BookmarkPlusIcon,
    title: "Save from anywhere",
    copy: "One tap on iPhone, one click in the browser. Capture is instant and complete: the page, the text, the images, the source.",
  },
  {
    number: "02",
    icon: WandSparklesIcon,
    title: "The agent takes over",
    copy: "It reads what you saved, understands what it is, writes the title you would have wanted, adds the tags, and files it in the right place. No folders for you to maintain.",
  },
  {
    number: "03",
    icon: MessageCircleIcon,
    title: "Ask like you would ask a friend",
    copy: "Type \"that pricing article from last month\" and it is there. Retrieval works on meaning, not on the exact words you saved.",
  },
];

export const AgenticWorkflow = () => {
  return (
    <section id="how" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-[12px] tracking-[0.3em] text-ember uppercase">
            How it works
          </p>
          <h2 className="mt-6 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight text-cream sm:text-5xl lg:text-6xl">
            You save. The agent does{" "}
            <em className="text-ember-soft">the librarian work.</em>
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <Reveal className="relative">
            <div className="relative h-full min-h-[420px] overflow-hidden rounded-3xl border border-cream/10">
              <img
                src="/images/landing-v2/portal-rocks.jpg"
                alt="A glowing doorway set between red rocks, with a path leading through it"
                className="absolute inset-0 size-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent p-7 pt-24">
                <p className="font-display text-2xl italic text-cream">
                  One save is a doorway back.
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-cream/70">
                  Everything you send through it comes out organized on the
                  other side.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col justify-center gap-4">
            {STEPS.map((step, index) => (
              <Reveal key={step.number} delay={index * 120}>
                <div className="group rounded-2xl border border-cream/10 bg-ink-soft/80 p-7 transition-colors duration-300 hover:border-ember/30 hover:bg-ink-card">
                  <div className="flex items-start gap-5">
                    <div className="flex flex-col items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-full border border-ember/25 bg-ember/10 text-ember transition-colors duration-300 group-hover:bg-ember/20">
                        <step.icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="font-display text-sm text-cream/30">
                        {step.number}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-cream">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-cream/60">
                        {step.copy}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-20" delay={100}>
          <AgentDemo />
        </Reveal>
      </div>
    </section>
  );
};
