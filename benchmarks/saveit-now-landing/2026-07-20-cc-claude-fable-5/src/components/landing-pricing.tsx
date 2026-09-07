import { CheckIcon } from "lucide-react";

import { Reveal } from "./reveal";

const TIERS = [
  {
    name: "Free",
    id: "tier-free",
    href: "/signin?intent=signup",
    price: "$0",
    priceNote: "forever",
    description: "Everything you need to feel the agent work.",
    features: [
      "Up to 20 bookmarks",
      "20 agent runs each month",
      "10 chat questions each month",
      "Browser extension",
      "iOS app",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    id: "tier-pro",
    href: "/upgrade",
    price: "$5",
    priceNote: "per month, billed annually",
    description: "For a library that grows every single day.",
    features: [
      "Up to 50,000 bookmarks",
      "1,500 agent runs each month",
      "200 chat questions each month",
      "API access",
      "Export to CSV",
      "Priority support",
    ],
    cta: "Go Pro",
    featured: true,
  },
];

export const LandingPricing = () => {
  return (
    <section id="pricing" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="text-center">
          <p className="text-[12px] tracking-[0.3em] text-ember uppercase">
            Pricing
          </p>
          <h2 className="mx-auto mt-6 max-w-2xl font-display text-4xl leading-[1.05] tracking-tight text-cream sm:text-5xl">
            Start free. Upgrade when{" "}
            <em className="text-ember-soft">your library grows.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-cream/60">
            No hidden fees, no lock-in. Cancel whenever you like and keep your
            data.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {TIERS.map((tier, index) => (
            <Reveal key={tier.id} delay={index * 120}>
              <div
                className={`relative h-full rounded-3xl p-8 sm:p-10 ${
                  tier.featured
                    ? "border border-ember/40 bg-gradient-to-b from-ember/[0.12] to-ink-soft shadow-[0_0_80px_-20px_rgba(255,122,69,0.35)]"
                    : "border border-cream/10 bg-ink-soft"
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3.5 left-8 rounded-full bg-ember px-3.5 py-1 text-[11px] font-semibold tracking-wide text-ink uppercase">
                    Most popular
                  </span>
                )}

                <h3
                  id={tier.id}
                  className="text-sm font-medium tracking-wide text-cream/70 uppercase"
                >
                  {tier.name}
                </h3>

                <p className="mt-5 flex items-baseline gap-x-2.5">
                  <span className="font-display text-6xl tracking-tight text-cream">
                    {tier.price}
                  </span>
                  <span className="text-sm text-cream/50">{tier.priceNote}</span>
                </p>

                <p className="mt-5 text-[15px] text-cream/65">
                  {tier.description}
                </p>

                <ul role="list" className="mt-8 space-y-3.5 text-sm text-cream/75">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-x-3">
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                          tier.featured ? "bg-ember/20" : "bg-cream/10"
                        }`}
                      >
                        <CheckIcon
                          aria-hidden="true"
                          className={`size-3 ${tier.featured ? "text-ember" : "text-cream/70"}`}
                        />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.href}
                  aria-describedby={tier.id}
                  className={`mt-10 inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-medium transition-all duration-300 ${
                    tier.featured
                      ? "bg-ember text-ink hover:bg-ember-soft hover:shadow-[0_0_44px_rgba(255,122,69,0.45)]"
                      : "border border-cream/20 text-cream hover:border-cream/40 hover:bg-cream/5"
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
};
