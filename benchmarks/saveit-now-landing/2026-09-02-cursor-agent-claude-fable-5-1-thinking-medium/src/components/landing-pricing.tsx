import { CheckIcon } from "lucide-react";

import { images } from "../lib/images";
import { CampaignPicture } from "./campaign-image";
import { SectionHeading } from "./section-heading";

const TIERS = [
  {
    id: "tier-free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    note: "No credit card required",
    description: "Everything you need to feel the difference on your first save.",
    cta: { label: "Start for free", href: "/signin?intent=signup&step=email" },
    features: [
      "20 bookmarks",
      "20 agent runs each month",
      "10 questions to your library each month",
      "Browser extension",
      "iOS app",
    ],
    featured: false,
  },
  {
    id: "tier-pro",
    name: "Pro",
    price: "$5",
    cadence: "per month",
    note: "Billed annually at $60",
    description: "Room for a lifetime of saves, with the agent working at full pace.",
    cta: { label: "Upgrade to Pro", href: "/upgrade" },
    features: [
      "Up to 50,000 bookmarks",
      "1,500 agent runs each month",
      "200 questions to your library each month",
      "API access",
      "Export to CSV",
      "Priority support",
    ],
    featured: true,
  },
];

export const LandingPricing = () => {
  return (
    <section
      id="pricing"
      className="relative scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32"
      aria-labelledby="pricing-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10">
          <CampaignPicture
            image={images.lake}
            className="absolute inset-0"
            imgClassName="object-[50%_60%]"
            sizes="(min-width: 1280px) 1200px, 100vw"
            decorative
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgb(12_10_16/0.55)_0%,rgb(12_10_16/0.82)_45%,rgb(12_10_16/0.96)_100%)]"
          />

          <div className="relative px-5 py-14 sm:px-10 sm:py-20 lg:px-16">
            <SectionHeading
              id="pricing-title"
              eyebrow="Pricing"
              align="center"
              title={
                <>
                  Calm, clear pricing.
                  <br />
                  <em className="text-ember-gradient">Start free, grow when ready.</em>
                </>
              }
              description="One free plan to try the whole workflow, one Pro plan when your library outgrows it. Cancel any time and keep Pro until the end of your billing period."
            />

            <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-2 md:gap-5">
              {TIERS.map((tier, index) => (
                <article
                  key={tier.id}
                  data-reveal
                  style={{ "--reveal-delay": `${index * 100}ms` } as React.CSSProperties}
                  aria-labelledby={tier.id}
                  className={`relative flex flex-col rounded-[26px] border p-7 backdrop-blur-xl sm:p-8 ${
                    tier.featured
                      ? "border-ember/40 bg-gradient-to-b from-ember/[0.16] via-ink/70 to-ink/80 shadow-glow"
                      : "border-white/12 bg-ink/65"
                  }`}
                >
                  {tier.featured ? (
                    <span className="absolute -top-3 right-6 rounded-full bg-ember px-3 py-1 text-[11.5px] font-semibold tracking-[0.06em] text-ink uppercase">
                      Most room
                    </span>
                  ) : null}

                  <h3 id={tier.id} className="text-[15px] font-medium text-sand">
                    {tier.name}
                  </h3>
                  <p className="mt-4 flex items-baseline gap-2">
                    <span className="font-display text-6xl leading-none tracking-[-0.03em] text-cream">
                      {tier.price}
                    </span>
                    <span className="text-[15px] text-dune">{tier.cadence}</span>
                  </p>
                  <p className="mt-2 text-[13px] text-dune">{tier.note}</p>
                  <p className="mt-5 text-[15px] leading-relaxed text-sand/85">
                    {tier.description}
                  </p>

                  <ul className="mt-7 flex flex-col gap-3 text-[14.5px] text-sand">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                            tier.featured ? "bg-ember/25 text-ember-2" : "bg-white/10 text-cream"
                          }`}
                        >
                          <CheckIcon className="size-3" aria-hidden />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={tier.cta.href}
                    className={`mt-8 inline-flex h-12 w-full items-center justify-center rounded-full text-[15px] font-medium transition-[background-color,transform] duration-300 active:scale-[0.98] ${
                      tier.featured
                        ? "bg-ember text-ink hover:bg-ember-2"
                        : "border border-white/15 bg-white/[0.04] text-cream hover:bg-white/[0.1]"
                    }`}
                  >
                    {tier.cta.label}
                  </a>
                </article>
              ))}
            </div>

            <p
              data-reveal
              className="mx-auto mt-8 max-w-xl text-center text-[13px] leading-relaxed text-dune"
            >
              Agent runs are the automatic capture and understanding that happen
              each time you save. Questions are the plain language searches you
              ask your library.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
