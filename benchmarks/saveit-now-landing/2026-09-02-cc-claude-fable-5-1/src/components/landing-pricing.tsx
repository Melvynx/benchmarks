import { CheckIcon } from "lucide-react";

import { links } from "../lib/links";
import { LinkButton } from "./ui/button";
import { Reveal } from "./ui/reveal";

const tiers = [
  {
    id: "tier-free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    note: "No credit card needed",
    description: "Enough to move your first saves in and feel the difference.",
    features: [
      "20 bookmarks",
      "Agent capture, summaries, and organization",
      "Browser extension and iOS app",
      "10 questions to the agent each month",
    ],
    cta: "Start free",
    href: links.signUp,
    featured: false,
  },
  {
    id: "tier-pro",
    name: "Pro",
    price: "$5",
    cadence: "per month",
    note: "Billed annually at $60 per year",
    description: "A home that grows with everything you will ever save.",
    features: [
      "Up to 50,000 bookmarks",
      "1,500 agent runs each month",
      "200 questions to the agent each month",
      "API access and CSV export",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    href: links.upgrade,
    featured: true,
  },
];

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-2xl text-center">
        <Reveal as="p" className="section-eyebrow justify-center">
          Pricing
        </Reveal>
        <Reveal
          as="h2"
          delay={80}
          className="font-display mt-5 text-4xl leading-[1.02] text-cream sm:text-5xl"
        >
          One price. <em className="text-ember-soft">Zero filing.</em>
        </Reveal>
        <Reveal
          as="p"
          delay={160}
          className="mt-5 text-[16px] leading-relaxed text-mist"
        >
          Start free and upgrade when your library outgrows it. No per bookmark
          charges and no surprise tiers.
        </Reveal>
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
        {tiers.map((tier, index) => (
          <Reveal
            key={tier.id}
            delay={index * 120}
            className={`relative flex flex-col rounded-[28px] p-[1px] ${
              tier.featured
                ? "bg-gradient-to-b from-ember-soft/70 via-ember/30 to-white/5 shadow-[0_40px_100px_-50px_rgba(255,122,61,0.6)]"
                : "bg-white/10"
            }`}
          >
            <div
              className={`flex h-full flex-col rounded-[27px] p-7 sm:p-8 ${
                tier.featured ? "bg-ink-2" : "bg-ink"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 id={tier.id} className="text-[15px] font-medium text-cream">
                  {tier.name}
                </h3>
                {tier.featured && (
                  <span className="rounded-full bg-ember/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ember-soft">
                    Most room
                  </span>
                )}
              </div>

              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-6xl leading-none text-cream">
                  {tier.price}
                </span>
                <span className="text-[14px] text-dim">{tier.cadence}</span>
              </p>
              <p className="mt-2 text-[13px] text-mist">{tier.note}</p>

              <p className="mt-6 text-[15px] leading-relaxed text-mist">
                {tier.description}
              </p>

              <ul role="list" className="mt-7 space-y-3 text-[14px] text-cream/85">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <CheckIcon
                      aria-hidden
                      className={`mt-0.5 size-4 shrink-0 ${
                        tier.featured ? "text-ember-soft" : "text-cream/60"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                <LinkButton
                  href={tier.href}
                  aria-describedby={tier.id}
                  size="lg"
                  variant={tier.featured ? "primary" : "outline"}
                  className="w-full"
                >
                  {tier.cta}
                </LinkButton>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
