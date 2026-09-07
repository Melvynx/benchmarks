import { CheckIcon } from "lucide-react";
import { Reveal } from "./reveal";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    note: "No credit card required",
    description:
      "Start your library today and feel what agentic bookmarking is like.",
    features: [
      "20 bookmarks",
      "20 AI agent runs per month",
      "10 agent questions per month",
      "Browser extensions and iOS app",
    ],
    cta: "Start free",
    href: "/signin?intent=signup&step=email",
    featured: false,
  },
  {
    name: "Pro",
    price: "$5",
    cadence: "per month",
    note: "$60 billed once a year",
    description:
      "A serious home for everything you read, watch, and want to keep.",
    features: [
      "Up to 50,000 bookmarks",
      "1,500 AI agent runs per month",
      "200 agent questions per month",
      "API access and CSV export",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    href: "/upgrade",
    featured: true,
  },
];

export const LandingPricing = () => {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 bg-coal-deep px-5 py-24 sm:px-8 lg:py-36"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="kicker justify-center text-ember">04 · Pricing</p>
          <h2 className="mt-6 text-balance text-center font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Free to start.{" "}
            <em className="display-italic text-flare">Five dollars to go all in.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-center text-base leading-relaxed text-dusk">
            No hidden tiers, no upsell maze. One free plan that is actually
            useful, one Pro plan for people who save everything.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 120} className="h-full">
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-8 transition-colors duration-300 sm:p-10 ${
                  tier.featured
                    ? "border-ember/50 bg-panel shadow-[0_0_80px_-20px] shadow-ember/30"
                    : "border-white/[0.08] bg-coal"
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3.5 left-8 rounded-full bg-ember px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-coal">
                    Most popular
                  </span>
                )}

                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-dusk">
                  {tier.name}
                </h3>

                <p className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-6xl tracking-tight text-ink">
                    {tier.price}
                  </span>
                  <span className="text-sm text-haze">{tier.cadence}</span>
                </p>
                <p className="mt-2 text-[13px] font-medium text-flare">
                  {tier.note}
                </p>

                <p className="mt-5 text-[15px] leading-relaxed text-dusk">
                  {tier.description}
                </p>

                <ul className="mt-8 flex-1 space-y-3.5">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-ink/85"
                    >
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-ember" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.href}
                  className={`mt-9 inline-flex h-12 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                    tier.featured
                      ? "bg-ember text-coal hover:bg-flare hover:shadow-[0_0_40px_-8px] hover:shadow-flare/50"
                      : "border border-white/15 text-ink hover:border-white/40 hover:bg-white/5"
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={150}>
          <p className="mt-8 text-center text-[13px] text-haze">
            7-day refund guarantee · Cancel anytime · Your library stays yours
          </p>
        </Reveal>
      </div>
    </section>
  );
};
