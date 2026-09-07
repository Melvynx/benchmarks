import { CheckIcon } from "lucide-react";

import { cx } from "../lib/cx";
import { LINKS } from "../lib/links";
import { Container, CTA, Eyebrow, Reveal } from "./ui";

type Tier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  billingNote?: string;
  pitch: string;
  featuresLabel: string;
  features: string[];
  href: string;
  action: string;
  featured: boolean;
};

const TIERS: Tier[] = [
  {
    id: "tier-free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    pitch:
      "The whole mechanism, at a smaller scale. Enough to find out whether you trust it.",
    featuresLabel: "What you get",
    features: [
      "20 bookmarks",
      "Automatic capture, summary, and tags",
      "Search by meaning",
      "Browser extension and iOS app",
      "20 AI runs and 10 questions each month",
    ],
    href: LINKS.signUp,
    action: "Start saving free",
    featured: false,
  },
  {
    id: "tier-pro",
    name: "Pro",
    price: "$5",
    cadence: "per month",
    billingNote: "Billed annually at $60",
    pitch:
      "For when saving has become a reflex and the library is doing real work.",
    featuresLabel: "Everything in Free, plus",
    features: [
      "Up to 50,000 bookmarks",
      "1,500 AI runs each month",
      "200 questions each month",
      "API access",
      "Export to CSV",
      "Priority support",
    ],
    href: LINKS.upgrade,
    action: "Upgrade to Pro",
    featured: true,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative py-24 sm:py-32 lg:py-40"
    >
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow>Pricing</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h2
              id="pricing-heading"
              className="mt-7 text-balance font-display display-tight text-[clamp(2.5rem,6.2vw,4.5rem)] text-cream"
            >
              Start free.
              <br />
              <em className="not-italic text-ember-gradient">
                Upgrade when it sticks.
              </em>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-7 text-pretty leading-relaxed text-mist">
              Nothing important is held back from the free tier. Pro is for when
              your library outgrows it.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          {TIERS.map((tier, index) => (
            <Reveal key={tier.id} delay={index * 110}>
              <div
                className={cx(
                  "relative flex h-full flex-col overflow-hidden rounded-2xl border p-8 sm:p-10",
                  tier.featured
                    ? "border-ember-500/35 bg-gradient-to-b from-ember-600/[0.14] to-ink-2"
                    : "border-line bg-ink-2",
                )}
              >
                {tier.featured && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-ember-500/25 blur-3xl"
                  />
                )}

                {/* flex-1 pins both CTAs to the same baseline even though the
                    two feature lists are different lengths. */}
                <div className="relative flex-1">
                  <h3
                    id={`${tier.id}-name`}
                    className="font-display text-2xl text-cream"
                  >
                    {tier.name}
                  </h3>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="font-display text-[3.75rem] leading-none text-cream">
                      {tier.price}
                    </span>
                    <span className="text-[0.9375rem] text-haze">
                      {tier.cadence}
                    </span>
                  </div>

                  {/* Always visible, so the annual term is never a surprise. */}
                  <p
                    className={cx(
                      "mt-2 text-[0.8125rem]",
                      tier.billingNote ? "text-ember-300" : "text-haze",
                    )}
                  >
                    {tier.billingNote ?? "No credit card required"}
                  </p>

                  <p className="mt-6 text-[0.9375rem] leading-relaxed text-mist">
                    {tier.pitch}
                  </p>

                  <div className="my-8 h-px bg-line" />

                  <p className="text-[0.75rem] font-medium uppercase tracking-[0.16em] text-haze">
                    {tier.featuresLabel}
                  </p>

                  <ul className="mt-5 space-y-3.5">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-3 text-[0.9375rem] leading-relaxed text-mist"
                      >
                        <CheckIcon
                          className={cx(
                            "mt-1 size-4 shrink-0",
                            tier.featured ? "text-ember-400" : "text-moss",
                          )}
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative mt-10 pt-0">
                  <CTA
                    href={tier.href}
                    size="lg"
                    variant={tier.featured ? "primary" : "ghost"}
                    className="w-full"
                  >
                    {tier.action}
                  </CTA>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={80}>
          <p className="mt-8 text-center text-[0.8125rem] text-haze">
            Cancel whenever you like. Pro stays active until the end of the
            period you paid for.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
