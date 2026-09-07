import { useState } from "react";

const faqs = [
  {
    question: "What does agentic bookmarking mean?",
    answer:
      "You save. The product acts. SaveIt captures the page, reads it, places it, and retrieves it when you ask. You do not maintain folders, tags, or a filing system for the library to work.",
  },
  {
    question: "How do I save from my phone?",
    answer:
      "Install the iOS app and use the Share Sheet from Safari, YouTube, Messages, or any app that shares URLs. The same agent files the save, so you can ask for it later from your phone or the web.",
  },
  {
    question: "What is included on Free and Pro?",
    answer:
      "Free includes up to 20 bookmarks, 20 AI bookmark runs, and 10 chat questions each month. Pro includes up to 50,000 bookmarks, 1,500 AI runs, and 200 chat questions each month, plus API access and CSV export. Pro is $5 per month, billed annually.",
  },
  {
    question: "Can I cancel Pro?",
    answer:
      "Yes. Manage or cancel from the billing provider you used. Pro stays active until the end of your current billing period.",
  },
  {
    question: "How do I upgrade?",
    answer:
      "Choose Upgrade to Pro during setup or from the pricing section, sign in to the account you want to upgrade, then complete checkout.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Bookmarks are stored on our servers so you can open them from any device. We use encryption and do not sell your library.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes. Contact hi@saveit.now within 7 days of a Pro charge for a refund.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance text-ink">
            Questions, answered.
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-mute">
            The short version: save it, then ask. Details below.
          </p>
        </div>

        <div className="divide-y divide-line border-y border-line">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <div key={faq.question}>
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold tracking-tight text-ink"
                    onClick={() => setOpen(isOpen ? -1 : index)}
                  >
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className={`grid size-8 shrink-0 place-items-center rounded-full border border-line text-lg leading-none transition-transform duration-300 ${
                        isOpen ? "rotate-45 bg-moss text-ink" : "text-mute"
                      }`}
                    >
                      +
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="faq-panel"
                  data-open={isOpen}
                >
                  <div>
                    <p className="pb-5 pr-12 text-sm leading-relaxed text-pretty text-mute">
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
}
