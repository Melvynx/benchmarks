"use client";

import { useState } from "react";
import { ChevronDownIcon, HelpCircleIcon, SparklesIcon } from "lucide-react";

interface FaqItem {
  id: string;
  category: "product" | "security" | "billing";
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "faq-agentic",
    category: "product",
    question: "What makes SaveIt.now agentic compared to traditional bookmark managers?",
    answer:
      "Traditional tools require you to manually file bookmarks into folders, assign tags, and remember where you put them. An agentic bookmark manager does the work for you. When you save a link, your agent captures full page text, generates a visual snapshot, categorizes concepts, and indexes the meaning automatically. You simply ask for what you need in plain words later.",
  },
  {
    id: "faq-how-save",
    category: "product",
    question: "How does the 'Just Save It' workflow function day to day?",
    answer:
      "You install our browser extension or enable our iOS share sheet. Whenever you find something interesting, you tap Save. There is no second step. No tagging dialogue, no folder picker, no categorization questionnaire. Your agent processes the item in the background so you can stay in your reading flow.",
  },
  {
    id: "faq-ios",
    category: "product",
    question: "How does SaveIt work across my Apple devices?",
    answer:
      "Our iOS integration uses native Apple extension hooks. You can save with one tap from the Safari share sheet, configure your iPhone Action Button for instant link capture, access recent saves through Home Screen widgets, and search your collection straight from iOS Spotlight.",
  },
  {
    id: "faq-free-vs-pro",
    category: "billing",
    question: "What are the exact differences between the Free and Pro tiers?",
    answer:
      "The Free tier gives you 20 bookmarks with full semantic search and browser extensions forever with no credit card required. Pro costs $5 per month billed annually ($60 per year) and includes up to 50,000 bookmarks, unlimited agent chat, developer API keys, permanent snapshot preservation, and full data export.",
  },
  {
    id: "faq-privacy",
    category: "security",
    question: "Is my library private and protected?",
    answer:
      "Yes. Your bookmarks and personal index belong solely to you. We encrypt your content in transit and at rest. We never sell your personal information, display ads, or share your reading history with third parties.",
  },
  {
    id: "faq-export-cancel",
    category: "billing",
    question: "Can I cancel my subscription or export my bookmarks?",
    answer:
      "You can cancel your subscription at any time with a single click in your account settings. You will retain Pro benefits until your billing period concludes. You can also export your complete library to CSV or JSON whenever you wish.",
  },
];

export const FAQ = () => {
  const [openIds, setOpenIds] = useState<string[]>(["faq-agentic"]);
  const [activeCategory, setActiveCategory] = useState<"all" | "product" | "security" | "billing">("all");

  const toggleFaq = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs =
    activeCategory === "all"
      ? FAQS
      : FAQS.filter((faq) => faq.category === activeCategory);

  return (
    <section id="faq" className="relative py-24 sm:py-32 overflow-hidden bg-[#090708]">
      <div className="relative mx-auto max-w-4xl px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8533]/30 bg-[#ff6b2b]/10 px-4 py-1.5 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(255,107,43,0.15)]">
            <HelpCircleIcon className="size-4 text-[#ff8533]" />
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#ffc299]">
              Clarity & Details
            </span>
          </div>

          <h2 className="font-editorial text-3xl sm:text-5xl tracking-tight leading-[1.08] text-[#f7f3ee]">
            Frequently answered{" "}
            <span className="text-gradient-ember italic">questions.</span>
          </h2>

          <p className="mt-4 text-base text-[#c4b5a8]">
            Everything you need to know about the product, privacy, and our agentic philosophy.
          </p>

          {/* Filter Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "all", label: "All Questions" },
              { id: "product", label: "Product & Agent" },
              { id: "billing", label: "Pricing & Plans" },
              { id: "security", label: "Security & Privacy" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer border ${
                  activeCategory === tab.id
                    ? "border-[#ff8533]/60 bg-[#ff6b2b]/15 text-[#ffa366] shadow-[0_0_15px_rgba(255,107,43,0.2)]"
                    : "border-white/10 bg-white/[0.03] text-[#8f7e72] hover:text-[#f7f3ee] hover:bg-white/[0.06]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion List */}
        <div className="mt-12 space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all ${
                  isOpen
                    ? "border-[#ff8533]/40 bg-[#140e11]/90 shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between p-5 sm:p-6 text-left cursor-pointer gap-4"
                >
                  <span className="text-base sm:text-lg font-medium text-[#f7f3ee]">
                    {faq.question}
                  </span>
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 transition-transform duration-300 ${
                      isOpen
                        ? "rotate-180 bg-[#ff6b2b]/20 text-[#ff8533] border-[#ff8533]/40"
                        : "bg-white/[0.04] text-[#8f7e72]"
                    }`}
                  >
                    <ChevronDownIcon className="size-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-sm leading-relaxed text-[#c4b5a8] border-t border-white/[0.06] pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Support Callout */}
        <div className="mt-12 text-center">
          <p className="text-xs text-[#8f7e72]">
            Have an unanswered question? Reach our team anytime at{" "}
            <a
              href="mailto:hi@saveit.now"
              className="text-[#ff9e59] underline hover:text-[#ffb380] transition-colors"
            >
              hi@saveit.now
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};
