import { useState } from "react";
import { CtaLink } from "./cta-link";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "No charge",
    note: "20 bookmarks, 20 AI bookmark runs a month, and 10 questions a month.",
    label:
      "Free. $0. 20 bookmarks, 20 AI bookmark runs a month, and 10 questions a month.",
    features: [
      "20 bookmarks",
      "20 AI bookmark runs a month",
      "10 questions a month",
      "Save from Chrome or Firefox",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$5",
    cadence: "per month",
    note: "Billed annually at $60.",
    label:
      "Pro. $5 per month, billed annually at $60. 50,000 bookmarks, 1,500 AI bookmark runs a month, 200 questions a month, API access, CSV export, and priority support.",
    features: [
      "50,000 bookmarks",
      "1,500 AI bookmark runs a month",
      "200 questions a month",
      "API access",
      "CSV export",
      "Priority support",
    ],
  },
] as const;

type PlanId = (typeof plans)[number]["id"];

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-coral">
      <path
        d="M3 8.5 6.2 12 13 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Pricing() {
  const [plan, setPlan] = useState<PlanId>("free");
  const selected = plans.find((item) => item.id === plan) ?? plans[0];

  return (
    <section id="pricing" className="section-anchor px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-3xl text-balance font-display text-[clamp(2.15rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
          A free library, then room to grow.
        </h2>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          Free holds 20 bookmarks. Pro is $5 per month, billed annually, and
          holds up to 50,000. An AI bookmark run is SaveIt reading and filing a
          save. A question is you asking for something in that library.
        </p>

        <fieldset className="mt-12">
          <legend className="sr-only">Choose a plan</legend>
          <div className="overflow-hidden rounded-xl border border-line lg:grid lg:grid-cols-2">
            {plans.map((item, index) => (
              <label
                key={item.id}
                className={`relative block cursor-pointer p-7 has-[:checked]:bg-ink-raised has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-gold sm:p-9 ${
                  index === 0 ? "border-b border-line lg:border-r lg:border-b-0" : ""
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={item.id}
                  checked={plan === item.id}
                  onChange={() => setPlan(item.id)}
                  aria-label={item.label}
                  className="sr-only"
                />
                <span className="flex items-baseline justify-between gap-4">
                  <span className="font-display text-2xl font-semibold tracking-[-0.03em]">
                    {item.name}
                  </span>
                  <span className="text-sm text-coral">
                    {plan === item.id ? "Selected" : "Select"}
                  </span>
                </span>
                <span className="mt-6 flex items-baseline gap-2">
                  <span
                    className={`font-display text-5xl font-semibold tracking-[-0.03em] ${
                      item.id === "pro" ? "text-coral" : "text-ivory"
                    }`}
                  >
                    {item.price}
                  </span>
                  <span className="text-sm text-muted">{item.cadence}</span>
                </span>
                <span className="mt-2 block text-sm text-muted">{item.note}</span>
                <ul className="mt-8 space-y-3 text-sm leading-relaxed text-ivory">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col items-start gap-4">
          <p aria-live="polite" className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            {selected.id === "free"
              ? "Free is selected. 20 bookmarks, 20 AI bookmark runs a month, and 10 questions a month, at no charge."
              : "Pro is selected. $5 per month, billed annually at $60."}
          </p>
          <CtaLink href="https://saveit.now" external>
            {selected.id === "free"
              ? "Continue with Free on saveit.now"
              : "Continue with Pro on saveit.now"}
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
