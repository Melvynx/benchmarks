const faqs = [
  {
    question: "What can I save?",
    answer:
      "Save web pages, YouTube videos, X posts, PDFs, and images. SaveIt.now keeps the content and the context together so the item is useful when you return.",
  },
  {
    question: "Do I need to create folders or tags?",
    answer:
      "No. SaveIt.now is designed to understand and organize each save automatically. You can focus on what is worth keeping instead of deciding where it belongs.",
  },
  {
    question: "What does agentic bookmarking mean?",
    answer:
      "It means the product acts after you save. It captures the item, understands it, categorizes it, organizes it, and makes it ready for retrieval without waiting for you to file it.",
  },
  {
    question: "How do I find something again?",
    answer:
      "Search your collection by what you remember or ask in natural language. SaveIt.now uses the meaning and context of your saves to bring the right item back.",
  },
  {
    question: "Is the iOS visual an app screenshot?",
    answer:
      "No. It is an experience illustration that shows the intended saving flow without pretending to display the final app interface.",
  },
  {
    question: "What does the 100% promise mean?",
    answer:
      "It is the product standard SaveIt.now builds toward: everything you save should remain findable. It is an aspiration about confidence and rediscovery, not a fabricated performance statistic.",
  },
  {
    question: "How is Pro billed?",
    answer:
      "Pro is $5 per month and billed annually. The annual charge is $60.",
  },
  {
    question: "Can I start for free?",
    answer:
      "Yes. The Free tier includes up to 20 bookmarks, agentic organization, the browser extension, and search across your saved collection.",
  },
];

export function FAQ() {
  return (
    <section className="faq section" id="faq">
      <div className="section-shell faq-grid">
        <div className="faq-heading" data-reveal>
          <p className="eyebrow">Good to know</p>
          <h2>Questions, answered clearly.</h2>
          <p className="section-lead">
            No mystery folders. No mystery pricing. Here is how SaveIt.now fits
            into the way you already save.
          </p>
          <a href="mailto:hi@saveit.now">Still curious? Ask us.</a>
        </div>

        <div className="faq-list" data-reveal>
          {faqs.map((faq, index) => (
            <details key={faq.question} open={index === 0}>
              <summary>
                <span>{faq.question}</span>
                <span className="faq-icon" aria-hidden="true" />
              </summary>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
