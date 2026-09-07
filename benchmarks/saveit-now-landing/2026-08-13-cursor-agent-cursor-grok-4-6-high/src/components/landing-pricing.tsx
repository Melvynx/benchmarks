import { CheckIcon } from "lucide-react";
import { LandingAppButton } from "./landing-app-button";

const tiers = [
  {
    name: "Free",
    id: "tier-free",
    price: "$0",
    cadence: "forever",
    description: "Enough to feel the habit: save, then ask.",
    features: ["20 bookmarks", "Chrome extension", "Ask your library"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    id: "tier-pro",
    price: "$5",
    cadence: "per month, billed annually",
    description: "Room for a real library, plus export and API access.",
    features: [
      "Up to 50,000 bookmarks",
      "1,500 AI runs each month",
      "200 chat questions each month",
      "API access",
      "Export to CSV",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    featured: true,
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display max-w-xl text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance text-ink">
          Free to start. Pro when the library grows.
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-pretty text-mute">
          Keep the same agent on both plans. Pro is $5 per month, billed
          annually, when you need the extra room.
        </p>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {tiers.map((tier) => (
            <article
              key={tier.id}
              className={`rounded-2xl p-8 ${
                tier.featured
                  ? "bg-portal text-canvas"
                  : "border border-line bg-panel text-ink"
              }`}
            >
              <h3 id={tier.id} className="text-base font-semibold">
                {tier.name}
              </h3>
              <p className="mt-4 flex items-end gap-2">
                <span className="font-display text-5xl font-bold tracking-[-0.03em]">
                  {tier.price}
                </span>
                <span
                  className={`pb-1 text-sm ${tier.featured ? "text-canvas/70" : "text-mute"}`}
                >
                  {tier.cadence}
                </span>
              </p>
              <p
                className={`mt-4 text-sm leading-relaxed ${tier.featured ? "text-canvas/75" : "text-mute"}`}
              >
                {tier.description}
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              {tier.featured ? (
                <a
                  href="/upgrade"
                  aria-describedby={tier.id}
                  className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-canvas px-5 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-moss"
                >
                  {tier.cta}
                </a>
              ) : (
                <LandingAppButton
                  className="mt-8 w-full border-ink/15 bg-transparent text-ink hover:bg-ink/10"
                  signedOutChildren={tier.cta}
                  variant="outline"
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
