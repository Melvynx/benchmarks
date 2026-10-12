import { CheckIcon } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    per: "free forever",
    body: "For trying the calm of just saving. Keep your first finds and feel retrieval work.",
    cta: "Start free",
    features: [
      "20 bookmarks to begin",
      "Browser extension and iOS share sheet",
      "Automatic summaries and topics",
      "Meaning based search and chat recall",
    ],
    featured: false,
  },
  {
    name: "Pro",
    price: "$5",
    per: "per month, billed annually",
    body: "For a real home for bookmarks. Save without counting and ask without limits.",
    cta: "Go Pro",
    features: [
      "Up to 50,000 bookmarks",
      "1,500 agent runs per month",
      "200 chat questions per month",
      "CSV export, API access and priority support",
    ],
    featured: true,
  },
];

export const LandingPricing = () => {
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
      <p className="eyebrow reveal">Pricing</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
        <h2 className="display-xl reveal text-4xl text-[#fff6ec] sm:text-5xl lg:text-6xl">
          Start free. <em className="text-[#ffc36b]">Grow when ready.</em>
        </h2>
        <p className="reveal max-w-xl text-base leading-relaxed text-[#c9b3a1]">
          One clear promise at every tier: what you save stays findable. Pro
          simply gives your growing library more room, more agent power and
          more ways to take your finds with you.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`reveal relative overflow-hidden rounded-3xl border p-8 sm:p-10 ${
              t.featured
                ? "border-[#ff5a1f]/50 bg-gradient-to-b from-[#ff5a1f]/20 via-[#1a120c] to-[#1a120c]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            {t.featured && (
              <span className="absolute right-6 top-6 rounded-full bg-[#ff5a1f] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white">
                Most loved
              </span>
            )}
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffc36b]">{t.name}</h3>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="display-xl text-6xl text-[#fff6ec]">{t.price}</span>
              <span className="text-sm text-[#c9b3a1]">{t.per}</span>
            </p>
            {t.featured && (
              <p className="mt-2 text-sm text-[#c9b3a1]">$60 billed once per year. Cancel anytime.</p>
            )}
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#c9b3a1]">{t.body}</p>
            <ul className="mt-6 space-y-3 text-[15px] text-[#f3d9bd]">
              {t.features.map((f) => (
                <li key={f} className="flex gap-3">
                  <CheckIcon className="mt-0.5 size-5 shrink-0 text-[#ffc36b]" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#cta"
              className={t.featured ? "btn-primary mt-8 w-full" : "btn-ghost mt-8 w-full"}
            >
              {t.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
};
