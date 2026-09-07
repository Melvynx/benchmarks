import { useId, useState } from "react";
import { Reveal } from "./reveal";

const faqs = [
  {
    question: 'What does "agentic bookmarking" mean?',
    answer:
      "You save a link. SaveIt captures the page, understands what it is about, categorizes it, and organizes it with related saves. Retrieval works from that understanding, so you ask in plain language instead of digging through folders.",
  },
  {
    question: "Will I still find what I saved months later?",
    answer:
      "That is the product promise we design toward. Because each save is understood and indexed by meaning, rediscovery does not depend on remembering which folder you used.",
  },
  {
    question: "What is included on Free vs Pro?",
    answer:
      "Free includes up to 20 bookmarks with core capture and ask. Pro is $5 per month billed annually, with room for up to 50,000 bookmarks plus higher AI runs, more chat questions, API access, and CSV export.",
  },
  {
    question: "Can I cancel Pro any time?",
    answer:
      "Yes. Manage or cancel from the billing provider you used. Pro stays active until the end of your current billing period.",
  },
  {
    question: "Is there an iOS app?",
    answer:
      "Yes. Save from the share sheet and rediscover on your phone with the same library you use in the browser. The mobile experience is built to feel immediate and native.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Your bookmarks sync to our servers so you can open them on any device. We encrypt data in transit and at rest, and we do not sell your library.",
  },
];

export function FAQ() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-surface px-6 py-[clamp(4.5rem,10vw,8rem)]">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-4">
          <p className="text-[13px] font-medium tracking-[0.16em] text-ember uppercase">
            FAQ
          </p>
          <h2 className="font-display mt-4 text-balance text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">
            Straight answers
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-muted">
            Short clarifications on how SaveIt works, what you get on each plan,
            and how your library stays with you.
          </p>
        </Reveal>

        <div className="lg:col-span-8">
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((faq, index) => {
              const open = openIndex === index;
              const panelId = `${baseId}-panel-${index}`;
              const buttonId = `${baseId}-button-${index}`;

              return (
                <Reveal key={faq.question} delayMs={index * 40}>
                  <div>
                    <h3>
                      <button
                        type="button"
                        id={buttonId}
                        aria-expanded={open}
                        aria-controls={panelId}
                        className="btn-press flex w-full items-center justify-between gap-6 py-5 text-left"
                        onClick={() =>
                          setOpenIndex((current) =>
                            current === index ? null : index,
                          )
                        }
                      >
                        <span className="font-display text-[17px] font-semibold tracking-tight text-ink sm:text-lg">
                          {faq.question}
                        </span>
                        <span
                          className={`relative size-8 shrink-0 rounded-full border border-line bg-bg transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                            open ? "rotate-45" : ""
                          }`}
                          aria-hidden="true"
                        >
                          <span className="absolute top-1/2 left-1/2 h-[1.5px] w-3 -translate-x-1/2 -translate-y-1/2 bg-ink" />
                          <span className="absolute top-1/2 left-1/2 h-3 w-[1.5px] -translate-x-1/2 -translate-y-1/2 bg-ink" />
                        </span>
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="faq-panel"
                      data-open={open ? "true" : "false"}
                    >
                      <div>
                        <p className="pb-5 text-pretty text-[15px] leading-relaxed text-muted">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
