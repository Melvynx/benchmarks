"use client";

import { useState } from "react";
import { CheckIcon, SparklesIcon, ShieldCheckIcon, HelpCircleIcon } from "lucide-react";

export const LandingPricing = () => {
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");

  const plans = [
    {
      name: "Free",
      id: "free-plan",
      badge: "Forever Starter",
      price: "$0",
      cadence: "forever",
      description:
        "Ideal for experiencing the magic of autonomous bookmarking with zero commitment.",
      ctaLabel: "Start free now",
      ctaHref: "/signin?intent=signup",
      highlighted: false,
      features: [
        "Up to 20 saved bookmarks",
        "Chrome & Firefox browser extensions",
        "iOS Share Sheet integration",
        "Autonomous capture & visual snapshots",
        "Semantic search & conceptual recall",
        "10 agent chat questions per month",
      ],
    },
    {
      name: "Pro",
      id: "pro-plan",
      badge: "Most Popular",
      price: billingCycle === "annual" ? "$5" : "$7",
      cadence: billingCycle === "annual" ? "per month, billed annually" : "per month, billed monthly",
      description:
        "For thinkers, builders, and researchers who want an infinite, indestructible external mind.",
      ctaLabel: "Upgrade to Pro",
      ctaHref: "/upgrade",
      highlighted: true,
      features: [
        "Up to 50,000 bookmarks",
        "Unlimited agent chat questions & summaries",
        "Full developer API access",
        "Complete export to CSV and JSON formats",
        "Deep PDF & YouTube transcript indexing",
        "Permanent snapshot preservation against link rot",
        "iCloud and multi-device real-time sync",
        "Priority concierge support",
      ],
    },
  ];

  return (
    <section id="pricing" className="relative py-24 sm:py-32 overflow-hidden bg-[#090708]">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(255,107,43,0.07)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#ff8533]">
            Simple & Transparent
          </p>
          <h2 className="mt-3 font-editorial text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[#f7f3ee]">
            Invest in clarity.{" "}
            <span className="text-gradient-ember italic">
              Never lose another idea.
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
            Start free with full core intelligence. Upgrade to Pro when your library
            grows into your primary intellectual workspace.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                billingCycle === "annual"
                  ? "bg-[#ff6b2b] text-white shadow-[0_0_15px_rgba(255,107,43,0.35)]"
                  : "text-[#c4b5a8] hover:text-white"
              }`}
            >
              Annual billing (Save 28%)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-[#ff6b2b] text-white shadow-[0_0_15px_rgba(255,107,43,0.35)]"
                  : "text-[#c4b5a8] hover:text-white"
              }`}
            >
              Monthly billing
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-3xl p-8 sm:p-10 transition-all ${
                plan.highlighted
                  ? "border-2 border-[#ff8533]/60 bg-gradient-to-b from-[#1c1216] via-[#140e11] to-[#0c090a] shadow-[0_20px_60px_rgba(255,107,43,0.2)]"
                  : "border border-white/10 bg-[#120e10]/80 backdrop-blur-md hover:border-white/20"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 right-8 rounded-full bg-gradient-to-r from-[#ff6b2b] to-[#ff8533] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#f7f3ee]">{plan.name}</h3>
                  {!plan.highlighted && (
                    <span className="text-xs font-medium text-[#8f7e72]">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-editorial text-5xl sm:text-6xl tracking-tight text-white font-bold">
                    {plan.price}
                  </span>
                  <span className="text-xs sm:text-sm text-[#a8978b]">
                    {plan.cadence}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-[#c4b5a8]">
                  {plan.description}
                </p>

                <div className="my-8 h-px bg-white/[0.08]" />

                <ul className="space-y-3.5 text-xs sm:text-sm text-[#d4c6ba]">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#ff6b2b]/15 text-[#ff8533] mt-0.5">
                        <CheckIcon className="size-3.5" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10">
                <a
                  href={plan.ctaHref}
                  className={`flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-[#ff6b2b] to-[#ff8533] text-white shadow-[0_0_25px_rgba(255,107,43,0.35)] hover:brightness-110 hover:shadow-[0_0_35px_rgba(255,107,43,0.5)]"
                      : "border border-white/15 bg-white/[0.04] text-[#f7f3ee] hover:bg-white/[0.08] hover:border-white/25"
                  }`}
                >
                  {plan.ctaLabel}
                </a>

                <p className="mt-3 text-center text-[11px] text-[#8f7e72]">
                  {plan.highlighted
                    ? "7-day instant refund policy. Cancel anytime."
                    : "No credit card required. Up and running in seconds."}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reassurance strip */}
        <div className="mt-14 max-w-4xl mx-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-wrap items-center justify-around gap-4 text-xs text-[#a8978b]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheckIcon className="size-4 text-[#ff8533]" />
            Your data is private and encrypted
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon className="size-4 text-[#ff8533]" />
            Full export ownership in CSV & JSON
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon className="size-4 text-[#ff8533]" />
            No advertising or third-party tracking
          </span>
        </div>
      </div>
    </section>
  );
};
