import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";

import { cx } from "../lib/cx";
import { LINKS } from "../lib/links";
import { Container, CTA, Eyebrow, Reveal } from "./ui";

const FAQS = [
  {
    q: "What does agentic actually mean here?",
    a: "It means the work happens without being asked. Most tools wait for an instruction. When something lands in SaveIt.now it is fetched, read, summarised, typed, and tagged on arrival, so the library is already organised the next time you open it.",
  },
  {
    q: "Do I have to tag or file anything?",
    a: "No. There is no folder to pick and no tag to invent. Tags are written for you and used for retrieval, and you can still search in plain language without touching them.",
  },
  {
    q: "What can I save?",
    a: "Web pages, YouTube videos, X posts, PDFs, and images. Each type is handled on its own terms, so a video is understood as a video rather than stored as a bare link.",
  },
  {
    q: "What are the limits?",
    a: "Free covers 20 bookmarks, 20 AI runs, and 10 questions each month. Pro covers up to 50,000 bookmarks, 1,500 AI runs, and 200 questions each month.",
  },
  {
    q: "Where is my data kept?",
    a: "On our servers, so your library is available from every device you use. It is encrypted, and it is never shared with third parties.",
  },
  {
    q: "How do I upgrade or cancel?",
    a: "Upgrade from the pricing section or from inside the app, then complete the secure checkout. Cancel from the same billing provider at any time, and Pro stays active until the end of the period you paid for.",
  },
];

/**
 * Accordion row.
 *
 * The panel animates on grid-template-rows rather than max-height, so it opens
 * to exactly its own content with no magic number to keep in sync.
 */
function Item({
  q,
  a,
  index,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const id = useId();

  return (
    <li className="group border-b border-line">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          className="flex w-full items-start gap-5 py-7 text-left"
        >
          <span
            aria-hidden="true"
            className={cx(
              "mt-1 font-display text-sm tabular-nums transition-colors duration-300",
              open ? "text-ember-400" : "text-haze",
            )}
          >
            0{index + 1}
          </span>

          <span
            className={cx(
              "flex-1 text-[1.0625rem] font-medium leading-snug transition-colors duration-300 sm:text-[1.1875rem]",
              open ? "text-cream" : "text-mist group-hover:text-cream",
            )}
          >
            {q}
          </span>

          <span
            aria-hidden="true"
            className={cx(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-500",
              open
                ? "rotate-45 border-ember-500/50 bg-ember-500/15 text-ember-300"
                : "border-line text-haze group-hover:border-line-2 group-hover:text-cream",
            )}
          >
            <PlusIcon className="size-3.5" />
          </span>
        </button>
      </h3>

      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        className={cx(
          "grid transition-all duration-500 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        {/* The clipping wrapper is what makes the 0fr row collapse cleanly. */}
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-8 pl-10 pr-6 text-[0.9375rem] leading-relaxed text-mist">
            {a}
          </p>
        </div>
      </div>
    </li>
  );
}

export function FAQ() {
  // One open at a time keeps the list scannable. null closes them all.
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative py-24 sm:py-32 lg:py-40"
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.5fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <Eyebrow tone="dusk">Questions</Eyebrow>
            </Reveal>
            <Reveal delay={60}>
              <h2
                id="faq-heading"
                className="mt-7 text-balance font-display display-tight text-[clamp(2.5rem,5.5vw,4rem)] text-cream"
              >
                Good to know
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-sm text-pretty leading-relaxed text-mist">
                If something is still unclear, ask. We answer these ourselves.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <div className="mt-8">
                <CTA href={LINKS.contact} variant="ghost">
                  Ask us anything
                </CTA>
              </div>
            </Reveal>
          </div>

          <Reveal delay={80}>
            <ul className="border-t border-line">
              {FAQS.map((faq, index) => (
                <Item
                  key={faq.q}
                  q={faq.q}
                  a={faq.a}
                  index={index}
                  open={openIndex === index}
                  onToggle={() =>
                    setOpenIndex((current) => (current === index ? null : index))
                  }
                />
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
