import { useState } from "react";

const faqs = [
  {
    question: "What do I actually do?",
    answer:
      "You save. From the Chrome or Firefox extension, or from the iOS app, you keep the page, video, image, PDF, or post in front of you. You do not file it. Later you describe what you remember, and SaveIt retrieves it.",
  },
  {
    question: "What does agentic mean here?",
    answer:
      "It means the product takes the next actions. After the save, SaveIt captures the content, reads it, categorizes it, organizes it, and retrieves it when you ask. Those steps are not a checklist for you.",
  },
  {
    question: "What is the 100% promise?",
    answer:
      "It is the standard the product is built for, not a measured success rate. The aim is rediscovery: if you saved something, you should be able to get it back by remembering a piece of it, instead of losing it in a folder, a tab, or a list you stopped opening.",
  },
  {
    question: "What are the limits on Free and Pro?",
    answer:
      "Free includes 20 bookmarks, 20 AI bookmark runs a month, and 10 questions a month. A run is SaveIt reading and filing a save. A question is you asking for something in that library. Pro is $5 per month, billed annually at $60. It includes 50,000 bookmarks, 1,500 AI bookmark runs a month, 200 questions a month, API access, CSV export, and priority support.",
  },
  {
    question: "How does the iOS app fit?",
    answer:
      "Saving and finding what you saved are meant to happen on the phone, in the moment, not only later at a desk. Web and iOS use one library. The photograph in the iOS section is campaign art, not a picture of the interface.",
  },
  {
    question: "Where are bookmarks stored?",
    answer:
      "On SaveIt servers, so the same library opens on the web and on iOS. SaveIt encrypts them and does not share them with third parties.",
  },
  {
    question: "Can I cancel or get a refund?",
    answer:
      "You can cancel with the billing provider you used. Pro stays active until the end of the period you already paid for. You can ask for a refund within 7 days by writing to hi@saveit.now.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="section-anchor px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-[clamp(2.15rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
          Practical questions.
        </h2>
        <div className="mt-10 border-t border-line">
          {faqs.map((faq, index) => {
            const open = openIndex === index;
            const questionId = `faq-q-${index}`;
            const answerId = `faq-a-${index}`;
            return (
              <div key={faq.question} className="border-b border-line">
                <h3 className="text-base font-semibold">
                  <button
                    id={questionId}
                    type="button"
                    className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-ivory"
                    aria-expanded={open}
                    aria-controls={answerId}
                    onClick={() => setOpenIndex(open ? null : index)}
                  >
                    <span>{faq.question}</span>
                    <span className={open ? "plus plus-open" : "plus"} aria-hidden="true" />
                  </button>
                </h3>
                <div id={answerId} role="region" aria-labelledby={questionId} hidden={!open}>
                  <p className="reveal max-w-2xl pb-5 text-sm leading-relaxed text-muted sm:text-base">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
