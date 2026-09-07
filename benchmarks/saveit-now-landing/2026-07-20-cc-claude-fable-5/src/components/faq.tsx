import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Reveal } from "./reveal";

const FAQS = [
  {
    question: "What does agentic bookmarking mean?",
    answer:
      "Most tools wait for your commands. An agent acts on its own. When you save something, SaveIt.now reads it, understands it, titles it, tags it, and files it without being asked. You only ever do one thing: save.",
  },
  {
    question: "Do I really never need folders?",
    answer:
      "You can still browse the tags and categories the agent creates, but you never have to build or maintain them. Organization is the product's job, not yours.",
  },
  {
    question: "What do I get on the free plan?",
    answer:
      "Free includes up to 20 bookmarks, 20 agent runs, and 10 chat questions each month, plus the browser extension and the iOS app. It is enough to feel the workflow before paying anything.",
  },
  {
    question: "How does Pro billing work?",
    answer:
      "Pro is $5 per month, billed annually. You can cancel any time from the billing provider you used, and Pro stays active until the end of your current billing period.",
  },
  {
    question: "Where does my data live?",
    answer:
      "Your bookmarks are stored on our servers so your library follows you across devices. Data is encrypted and never shared with third parties.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer a 7-day refund guarantee. Write to hi@saveit.now and you get an instant refund. No questions asked.",
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Reveal>
          <p className="text-[12px] tracking-[0.3em] text-ember uppercase">
            FAQ
          </p>
          <h2 className="mt-6 font-display text-4xl leading-[1.05] tracking-tight text-cream sm:text-5xl">
            Questions, <em className="text-ember-soft">answered.</em>
          </h2>
          <p className="mt-5 max-w-sm text-base text-cream/60">
            Anything else? Write to{" "}
            <a
              href="mailto:hi@saveit.now"
              className="text-ember-soft underline decoration-ember/40 underline-offset-4 transition-colors hover:text-ember"
            >
              hi@saveit.now
            </a>{" "}
            and a human answers.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="divide-y divide-cream/10 border-y border-cream/10">
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={faq.question}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                      id={`faq-button-${index}`}
                      className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-ember-soft"
                    >
                      <span
                        className={`text-[16px] font-medium transition-colors ${
                          isOpen ? "text-ember-soft" : "text-cream"
                        }`}
                      >
                        {faq.question}
                      </span>
                      <PlusIcon
                        aria-hidden="true"
                        className={`size-4.5 shrink-0 text-cream/50 transition-transform duration-300 ${
                          isOpen ? "rotate-45 text-ember" : ""
                        }`}
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-button-${index}`}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-xl pb-6 text-[15px] leading-relaxed text-cream/65">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
};
