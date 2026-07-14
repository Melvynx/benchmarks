import { AUTH_PLANS } from "@/lib/auth/stripe/auth-plans";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Key } from "lucide-react";
import Link from "@/compat/link";
import { usePathname, useRouter } from "@/compat/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "../form/submit-button";
import { PricingCard } from "./pricing-card";

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  const subscriptionPlans = AUTH_PLANS.filter(
    (p) => !p.isHidden && !p.isLifetime,
  );
  const lifetimePlan = AUTH_PLANS.find((p) => p.isLifetime && !p.isHidden);

  return (
    <section className="bg-foreground relative w-full px-4 py-16 md:py-24 lg:py-32">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/70">
            Pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Pick your plan
          </h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-white/50">
            Start creating thumbnails in under a minute. No credit card
            required.
          </p>

          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium text-white/50 transition-all",
                !isYearly && "bg-white text-black shadow-sm",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium text-white/50 transition-all",
                isYearly && "bg-white text-black shadow-sm",
              )}
            >
              Yearly
              <span className="text-primary ml-1.5 text-xs font-semibold">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-md items-center gap-0 lg:max-w-none lg:grid-cols-3">
          {subscriptionPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} isYearly={isYearly} />
          ))}
        </div>

        {lifetimePlan && <LifetimeStrip plan={lifetimePlan} />}

        <div className="mt-16 text-center">
          <p className="text-white/40">
            All plans include basic features like unlimited access and community
            support.
          </p>
          <p className="mt-2 text-white/40">
            Need a custom plan?{" "}
            <Link
              href="/contact"
              className="text-primary font-medium hover:underline"
            >
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function LifetimeStrip({ plan }: { plan: (typeof AUTH_PLANS)[number] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const orgSlug = pathname.match(/^\/orgs\/([^/]+)/)?.[1];

  const handleClick = () => {
    if (!session) {
      router.push("/auth/start");
      return;
    }
    if (!orgSlug) {
      toast.error("No active organization");
      return;
    }
    router.push(`/orgs/${orgSlug}/settings/billing`);
  };

  return (
    <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-6 py-4 sm:flex-row">
      <div className="flex items-center gap-3">
        <Key className="size-4 text-white/40" />
        <div>
          <span className="text-sm font-medium text-white">
            Lifetime Access
          </span>
          <span className="mx-2 text-white/30">·</span>
          <span className="text-sm text-white/40">
            Bring your own API keys, pay once
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-lg font-bold text-white">${plan.price}</span>
        <LoadingButton
          loading={false}
          size="sm"
          variant="default"
          className="border-transparent bg-white text-black shadow-sm hover:bg-white/90 hover:text-black focus-visible:ring-white/40"
          onClick={handleClick}
        >
          {!session ? "Sign up" : "Buy Lifetime"}
        </LoadingButton>
      </div>
    </div>
  );
}
