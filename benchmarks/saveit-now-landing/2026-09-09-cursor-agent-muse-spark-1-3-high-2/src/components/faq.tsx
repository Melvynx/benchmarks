import { useState } from "react";
import { PlusIcon } from "lucide-react";

const faqs = [
  {
    q: "What does agentic bookmarking actually do?",
    a: "You only save. SaveIt then captures the full content, writes a summary, detects the topic and links it to related saves. When you ask later in plain words, it searches by meaning and returns the original source.",
  },
  {
    q: "How is this different from browser bookmarks or open tabs?",
    a: "Browser bookmarks store a title and a link that you must file and remember. Tabs vanish under pressure. SaveIt keeps the content itself, organizes it for you and lets you describe what you remember instead of where you put it.",
  },
  {
    q: "What can I save?",
    a: "Articles, videos, PDFs, posts, photos and links from desktop or iPhone. Use the extension, the iOS share sheet or paste a URL. Your agent reads and indexes each type so everything is searchable in one home.",
  },
  {
    q: "What does the 100 percent promise mean?",
    a: "It is our product promise about rediscovery and confidence. SaveIt is designed so that what you save stays findable and comes back when you ask. It expresses the standard we build toward, not a statistic or a guarantee.",
  },
  {
    q: "How does SaveIt work on iPhone?",
    a: "Share anything to SaveIt from iOS and it is kept in seconds, even offline. Later, search or ask from your phone and open the original in one tap. The page shows an illustrative concept of the flow rather than screenshots of the app.",
  },
  {
    q: "What do Free and Pro include?",
    a: "Free is for starting out, with 20 bookmarks plus the extension, iOS saving and meaning based search. Pro is $5 per month billed annually, which is $60 per year, and adds room for up to 50,000 bookmarks, far more agent runs and questions, plus export, API access and priority support. Cancel anytime.",
  },
];

export const FAQ = () => {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
      <p className="eyebrow reveal">Questions</p>
      <h2 className="display-xl reveal mt-4 text-4xl text-[#fff6ec] sm:text-5xl">
        Asked often, <em className="text-[#ffc36b]">answered plainly.</em>
      </h2>

      <div className="mt-10 space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={f.q}
              className={`reveal overflow-hidden rounded-2xl border transition-colors ${
                isOpen ? "border-[#ff5a1f]/40 bg-[#ff5a1f]/[0.07]" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-[15px] font-semibold text-[#fff6ec] sm:text-base">{f.q}</span>
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 ${
                    isOpen ? "rotate-45 border-[#ff5a1f] bg-[#ff5a1f] text-white" : "border-white/15 text-[#ffc36b]"
                  }`}
                >
                  <PlusIcon className="size-4" />
                </span>
              </button>
              <div id={`faq-panel-${i}`} className="faq-panel" data-open={isOpen} role="region">
                <div className="faq-inner">
                  <p className="px-6 pb-6 text-[15px] leading-relaxed text-[#c9b3a1]">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
