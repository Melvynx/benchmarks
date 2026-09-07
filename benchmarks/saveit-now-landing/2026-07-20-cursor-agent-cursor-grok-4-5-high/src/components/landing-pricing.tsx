import { CheckIcon } from "lucide-react";
import { Reveal } from "./reveal";

const tiers = [
  {
    name: "Free",
    id: "tier-free",
    href: "/signin?intent=signup&step=email",
    price: "$0",
    period: "forever",
    description: "Start saving with agentic organization on a light monthly allowance.",
    features: [
      "Up to 20 bookmarks",
      "Browser extension capture",
      "Ask your saves in plain language",
      "iOS share sheet access",
    ],
    featured: false,
    cta: "Start free",
  },
  {
    name: "Pro",
    id: "tier-pro",
    href: "/upgrade",
    price: "$5",
    period: "per month",
    description: "Room for a serious library, with higher AI runs and chat capacity.",
    features: [
      "Up to 50,000 bookmarks",
      "Higher AI understanding runs",
      "More chat questions each month",
      "API access and CSV export",
      "Priority support",
    ],
    featured: true,
    cta: "Upgrade to Pro",
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" className="bg-bg px-6 py-[clamp(4.5rem,10vw,8rem)]">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-[13px] font-medium tracking-[0.16em] text-ember uppercase">
            Pricing
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-balance text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">
            Free to start. Pro when your library grows.
          </h2>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            Pro is $5 per month, billed annually. Keep the free tier as long as
            it fits. Upgrade when you need more room and capacity.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-2 lg:gap-6">
          {tiers.map((tier, i) => (
            <Reveal key={tier.id} delayMs={i * 80}>
              <div
                className={`flex h-full flex-col rounded-[1.5rem] p-8 sm:p-10 ${
                  tier.featured
                    ? "bg-ink text-on-dark shadow-[0_40px_100px_-50px_rgba(42,33,28,0.7)]"
                    : "border border-line bg-surface text-ink"
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3
                    id={tier.id}
                    className="font-display text-xl font-semibold tracking-tight"
                  >
                    {tier.name}
                  </h3>
                  {tier.featured ? (
                    <span className="rounded-full bg-ember/20 px-3 py-1 text-[11px] font-medium tracking-wide text-portal uppercase">
                      Billed annually
                    </span>
                  ) : null}
                </div>

                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-semibold tracking-[-0.03em] tabular-nums">
                    {tier.price}
                  </span>
                  <span
                    className={`text-sm ${
                      tier.featured ? "text-white/60" : "text-muted"
                    }`}
                  >
                    {tier.period}
                  </span>
                </p>

                <p
                  className={`mt-4 text-pretty text-base leading-relaxed ${
                    tier.featured ? "text-white/75" : "text-muted"
                  }`}
                >
                  {tier.description}
                </p>

                <ul className="mt-8 flex-1 space-y-3" role="list">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-relaxed">
                      <CheckIcon
                        aria-hidden="true"
                        className={`mt-0.5 size-4 shrink-0 ${
                          tier.featured ? "text-ember" : "text-ember"
                        }`}
                      />
                      <span
                        className={
                          tier.featured ? "text-white/85" : "text-ink/85"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.href}
                  aria-describedby={tier.id}
                  className={`btn-press mt-10 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium ${
                    tier.featured
                      ? "bg-ember text-on-dark hover:bg-ember-deep"
                      : "bg-ink text-on-dark hover:bg-ink/90"
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
