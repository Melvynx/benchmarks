import { useId, useState } from "react";

import { CONTACT_EMAIL } from "../lib/site";
import { Reveal } from "./ui/reveal";
import { SectionLabel } from "./ui/section-label";

const FAQS = [
  {
    q: "What does agentic actually mean here?",
    a: "It means the work happens without being asked. Most tools wait for a command. SaveIt opens what you saved, reads it, decides what it is, writes the summary and the tags, and puts it where it belongs. You never see a filing prompt, because there is not one.",
  },
  {
    q: "Do I have to organize anything myself?",
    a: "No. There is no folder to choose at save time and no cleanup afterwards. You can still add your own tags if you enjoy it, but nothing in the product depends on you doing so.",
  },
  {
    q: "What can I save?",
    a: "Web pages, articles, YouTube videos, X posts, PDFs, product pages and images. If it has an address or a share sheet entry, it belongs in your library.",
  },
  {
    q: "How do I find something again?",
    a: "Describe it. Search runs on meaning rather than exact wording, so a rough memory of the subject is usually enough to bring back the right item, even years later and even if you never knew its title.",
  },
  {
    q: "What are the limits on each plan?",
    a: "Free covers 20 bookmarks, 20 AI bookmark runs and 10 chat questions each month. Pro covers up to 50,000 bookmarks, 1,500 AI runs and 200 chat questions each month.",
  },
  {
    q: "Where does my data live?",
    a: "On our servers, which is what lets your library follow you between the browser and your phone. It is encrypted and it is not shared with third parties.",
  },
  {
    q: "Can I cancel or take my data with me?",
    a: "Yes to both. Cancel from the billing provider you signed up with and Pro runs to the end of the period you paid for. Pro also includes CSV export and API access, so your library can leave with you.",
  },
] as const;

/**
 * One open answer at a time, on the same 0fr to 1fr grid transition used
 * elsewhere on the page, so the reduced-motion rule covers it too.
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section id="faq" className="relative py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <SectionLabel index="07">Questions</SectionLabel>
              <h2 className="display-md mt-6 text-glow">
                Everything else{" "}
                <em className="italic text-muted">worth asking.</em>
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
                Still curious about something? Write to{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-amber underline decoration-amber/35 underline-offset-4 transition-colors hover:decoration-amber"
                >
                  {CONTACT_EMAIL}
                </a>{" "}
                and a person will answer.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100} className="lg:col-span-8">
            <ul className="border-t border-lilac/12">
              {FAQS.map((item, index) => {
                const isOpen = open === index;
                const buttonId = `${baseId}-q-${index}`;
                const panelId = `${baseId}-a-${index}`;

                return (
                  <li key={item.q} className="border-b border-lilac/12">
                    <h3>
                      <button
                        type="button"
                        id={buttonId}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpen(isOpen ? null : index)}
                        className="group flex w-full items-start justify-between gap-6 py-6 text-left sm:py-7"
                      >
                        <span
                          className={`font-display text-xl transition-colors duration-300 sm:text-2xl ${
                            isOpen
                              ? "text-glow"
                              : "text-cream/85 group-hover:text-glow"
                          }`}
                        >
                          {item.q}
                        </span>
                        <PlusMinus open={isOpen} />
                      </button>
                    </h3>

                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="accordion-body"
                      data-open={isOpen}
                    >
                      <div>
                        <p className="max-w-2xl pb-7 pr-10 text-[15px] leading-relaxed text-muted">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** A plus that turns into a minus, and warms up, as its answer opens. */
function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
        open
          ? "border-ember/60 bg-ember/15 text-amber"
          : "border-lilac/20 text-muted group-hover:border-lilac/40"
      }`}
    >
      <span className="absolute h-px w-3 bg-current" />
      <span
        className={`absolute h-3 w-px bg-current transition-transform duration-300 ${
          open ? "scale-y-0" : "scale-y-100"
        }`}
      />
    </span>
  );
}
