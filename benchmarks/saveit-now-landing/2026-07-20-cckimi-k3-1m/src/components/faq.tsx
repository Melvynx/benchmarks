import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Reveal } from "./reveal";

const FAQS = [
  {
    question: "What does agentic bookmarking mean?",
    answer:
      "It means the product does the work. When you save a page, your agent reads it, understands what it is, files it in the right place, and brings it back when you ask. You never organize anything by hand.",
  },
  {
    question: "What can I save?",
    answer:
      "Articles, videos, papers, threads, PDFs, podcasts, and anything else with a link. Save from the browser extension on desktop or the share sheet on iOS, and everything lands in one library.",
  },
  {
    question: "What are the limits on Free and Pro?",
    answer:
      "Free includes 20 bookmarks, 20 AI agent runs, and 10 agent questions each month. Pro includes up to 50,000 bookmarks, 1,500 AI runs, and 200 agent questions each month.",
  },
  {
    question: "How do I upgrade to Pro?",
    answer:
      "Choose Upgrade to Pro during setup or from the pricing section, sign in to the account you want to upgrade, and complete the secure checkout. Pro is $5 per month, billed annually.",
  },
  {
    question: "Is my data sent to any server?",
    answer:
      "Yes, your bookmarks are stored on our servers so you can reach them from any device. They are encrypted and never shared with third parties.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Yes. Every Pro plan comes with a 7-day refund guarantee. Write to hi@saveit.now and you get an instant refund, no questions asked.",
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 px-5 py-24 sm:px-8 lg:py-36">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <p className="kicker text-ember">05 · Questions</p>
            <h2 className="mt-6 text-balance font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Everything you might{" "}
              <em className="display-italic text-flare">want to ask.</em>
            </h2>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-dusk">
              Still curious after this? Write to{" "}
              <a
                href="mailto:hi@saveit.now"
                className="text-flare underline decoration-flare/40 underline-offset-4 transition-colors hover:decoration-flare"
              >
                hi@saveit.now
              </a>{" "}
              and a human replies.
            </p>
          </div>
        </Reveal>

        <div>
          {FAQS.map((faq, i) => {
            const open = openIndex === i;
            return (
              <Reveal key={faq.question} delay={i * 60}>
                <div className="border-b border-white/[0.08] first:border-t">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-button-${i}`}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span
                      className={`text-base font-medium tracking-tight transition-colors duration-300 sm:text-lg ${
                        open ? "text-flare" : "text-ink group-hover:text-flare"
                      }`}
                    >
                      {faq.question}
                    </span>
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        open
                          ? "rotate-45 border-ember/50 bg-ember/15 text-flare"
                          : "border-white/15 text-dusk group-hover:border-ember/40 group-hover:text-flare"
                      }`}
                    >
                      <PlusIcon className="size-4" />
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-button-${i}`}
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      open
                        ? "grid-rows-[1fr] pb-6 opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl text-[15px] leading-relaxed text-haze">
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
    </section>
  );
};
