import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";

import { Reveal } from "./ui/reveal";

const faqs = [
  {
    question: "What does agentic bookmarking mean?",
    answer:
      "Most tools wait for you to file things. In SaveIt.now an agent acts on its own the moment you save. It captures a screenshot and the text, writes a summary, assigns categories and tags, and keeps everything searchable. You only save.",
  },
  {
    question: "What can I save?",
    answer:
      "Web pages, articles, YouTube videos, tweets, PDFs, and images. Use the browser extension, the iOS share sheet, or paste a link into the web app.",
  },
  {
    question: "How do I find something again?",
    answer:
      "Search by whatever you remember, or ask the agent a question in plain words. It searches the meaning of what you saved, including the summary and page content, so a vague description still works.",
  },
  {
    question: "What are the limits on each plan?",
    answer:
      "Free includes 20 bookmarks, 20 agent runs, and 10 questions each month. Pro includes up to 50,000 bookmarks, 1,500 agent runs, and 200 questions each month, plus API access and CSV export.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Your bookmarks are stored on SaveIt.now servers so you can reach them from any device. Data is encrypted and never shared with third parties. Pro users can export everything to CSV at any time.",
  },
  {
    question: "Can I cancel or get a refund?",
    answer:
      "Yes. Cancel any time from the billing provider you used, and Pro stays active until the end of the current period. If Pro is not for you, write to hi@saveit.now within 7 days for a refund.",
  },
];

function FaqItem({
  item,
  open,
  onToggle,
}: {
  item: (typeof faqs)[number];
  open: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <div className="border-b border-white/10">
      <h3>
        <button
          type="button"
          id={`${id}-button`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-ember-soft"
        >
          <span className="text-[17px] font-medium text-cream">
            {item.question}
          </span>
          <span
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-cream transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "rotate-45 bg-ember text-ink" : ""
            }`}
          >
            <PlusIcon className="size-4" aria-hidden />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        className="accordion-panel"
        data-open={open}
      >
        <div>
          <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-mist">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <Reveal as="p" className="section-eyebrow">
            Questions
          </Reveal>
          <Reveal
            as="h2"
            delay={80}
            className="font-display mt-5 text-4xl leading-[1.02] text-cream sm:text-5xl"
          >
            Before you <em className="text-ember-soft">move in.</em>
          </Reveal>
          <Reveal
            as="p"
            delay={160}
            className="mt-5 max-w-sm text-[15px] leading-relaxed text-mist"
          >
            Anything else? Write to{" "}
            <a
              href="mailto:hi@saveit.now"
              className="text-cream underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-ember-soft"
            >
              hi@saveit.now
            </a>{" "}
            and a human answers.
          </Reveal>
        </div>

        <Reveal delay={120} className="border-t border-white/10">
          {faqs.map((item, index) => (
            <FaqItem
              key={item.question}
              item={item}
              open={openIndex === index}
              onToggle={() =>
                setOpenIndex((current) => (current === index ? null : index))
              }
            />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
