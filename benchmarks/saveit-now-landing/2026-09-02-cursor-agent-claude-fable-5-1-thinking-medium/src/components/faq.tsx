import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";

import { SectionHeading } from "./section-heading";

const FAQS = [
  {
    question: "What does agentic bookmarking actually mean?",
    answer:
      "Most tools wait for you to file things. SaveIt.now puts an agent on the job instead. When you save, it reads the page, writes a summary, adds tags, and files the item. When you ask for something later, it searches by meaning and brings the save back. You only do the saving.",
  },
  {
    question: "Do I have to organize anything myself?",
    answer:
      "No. There are no folders to create and no tags you have to remember. Every save is organized automatically at capture time. If you like to add your own notes or tags you can, but nothing depends on it.",
  },
  {
    question: "What can I save?",
    answer:
      "Articles, YouTube videos, threads, PDFs, product pages, recipes, repositories, and most other links. Save from the browser extension on desktop or the share sheet on iPhone.",
  },
  {
    question: "What are the limits on each plan?",
    answer:
      "Free includes up to 20 bookmarks, 20 agent runs, and 10 questions each month. Pro includes up to 50,000 bookmarks, 1,500 agent runs, and 200 questions each month, plus API access and CSV export.",
  },
  {
    question: "Is my data stored on your servers?",
    answer:
      "Yes. Your bookmarks are stored on SaveIt.now servers so the same library is available on every device. Data is encrypted and never shared with third parties.",
  },
  {
    question: "Can I cancel Pro at any time?",
    answer:
      "Yes. Manage or cancel from the billing provider you used to subscribe. Pro stays active until the end of your current billing period. If something is not right, write to hi@saveit.now within 7 days for a refund.",
  },
];

export const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section
      id="faq"
      className="relative scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32"
      aria-labelledby="faq-title"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="faq-title"
            eyebrow="Questions"
            title={
              <>
                Good questions,
                <br />
                <em className="text-ember-gradient">straight answers.</em>
              </>
            }
            description="Anything else? Write to hi@saveit.now and a human replies."
          />
        </div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {FAQS.map((faq, index) => {
            const isOpen = open === index;
            const buttonId = `${baseId}-button-${index}`;
            const panelId = `${baseId}-panel-${index}`;
            return (
              <div
                key={faq.question}
                data-reveal
                style={{ "--reveal-delay": `${index * 50}ms` } as React.CSSProperties}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : index)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-cream"
                  >
                    <span
                      className={`text-[17px] leading-snug font-medium tracking-[-0.01em] transition-colors sm:text-[19px] ${
                        isOpen ? "text-cream" : "text-sand group-hover:text-cream"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,border-color,color] duration-500 ${
                        isOpen
                          ? "rotate-45 border-ember/50 bg-ember/15 text-ember-2"
                          : "border-white/12 text-dune group-hover:border-white/30 group-hover:text-cream"
                      }`}
                      aria-hidden
                    >
                      <PlusIcon className="size-4" />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="accordion-panel"
                  data-open={isOpen}
                >
                  <div>
                    <p className="max-w-2xl pb-7 text-[15.5px] leading-relaxed text-sand/85">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
