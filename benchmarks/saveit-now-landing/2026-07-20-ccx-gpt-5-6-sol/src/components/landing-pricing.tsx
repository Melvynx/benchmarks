import { Check, Sparkles } from "lucide-react";

const tiers = [
  {
    name: "Free",
    id: "tier-free",
    href: "/signin?intent=signup&step=email",
    price: "$0",
    cadence: "to start",
    description:
      "A real bookmark home for the things you want to keep close.",
    features: [
      "Up to 20 bookmarks",
      "Agentic capture and organization",
      "Browser extension",
      "Search your saved collection",
    ],
    cta: "Start saving free",
    featured: false,
  },
  {
    name: "Pro",
    id: "tier-pro",
    href: "/upgrade",
    price: "$5",
    cadence: "per month",
    description:
      "For people who rely on their saved knowledge every day.",
    features: [
      "Everything in Free",
      "Up to 50,000 bookmarks",
      "API access",
      "CSV export",
      "Priority support",
    ],
    cta: "Choose Pro",
    featured: true,
  },
];

export function LandingPricing() {
  return (
    <section className="pricing section" id="pricing">
      <div className="section-shell">
        <div className="section-heading pricing-heading" data-reveal>
          <div>
            <p className="eyebrow">Simple pricing</p>
            <h2>Start free. Go Pro when your collection grows.</h2>
          </div>
          <p className="section-lead">
            The same simple idea at every level: save it now, find it later.
          </p>
        </div>

        <div className="pricing-grid" data-reveal>
          {tiers.map((tier) => (
            <article
              className={`pricing-card ${tier.featured ? "is-featured" : ""}`}
              key={tier.id}
            >
              {tier.featured ? (
                <div className="pricing-badge">
                  <Sparkles aria-hidden="true" size={14} />
                  Full experience
                </div>
              ) : null}

              <div className="pricing-card-top">
                <p className="pricing-plan">{tier.name}</p>
                <div className="pricing-price">
                  <span>{tier.price}</span>
                  <small>{tier.cadence}</small>
                </div>
                {tier.featured ? (
                  <p className="billing-note">Billed annually at $60</p>
                ) : (
                  <p className="billing-note">No card needed to begin</p>
                )}
                <p className="pricing-description">{tier.description}</p>
              </div>

              <ul className="pricing-features" role="list">
                {tier.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">
                      <Check size={15} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                className={`button pricing-button ${
                  tier.featured ? "button-default" : "button-outline"
                }`}
                href={tier.href}
                aria-describedby={tier.id}
              >
                {tier.cta}
              </a>
              <span className="sr-only" id={tier.id}>
                {tier.name} plan at {tier.price} {tier.cadence}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
