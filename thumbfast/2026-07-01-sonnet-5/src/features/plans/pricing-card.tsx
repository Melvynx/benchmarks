import { Check, Star } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import type { AppAuthPlan } from "@/lib/auth/stripe/auth-plans";
import { LIMITS_CONFIG } from "@/lib/auth/stripe/auth-plans";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "@/compat/navigation";
import { toast } from "sonner";
import { LoadingButton } from "../form/submit-button";

export function PricingCard({
  plan,
  isYearly,
}: {
  plan: AppAuthPlan;
  isYearly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const orgSlug = pathname.match(/^\/orgs\/([^/]+)/)?.[1];

  const monthlyPrice = plan.price;
  const yearlyPrice = plan.yearlyPrice ?? plan.price * 12;
  const displayPrice = isYearly ? Math.round(yearlyPrice / 12) : monthlyPrice;

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

  const isPopular = plan.isPopular;
  const isLifetime = plan.isLifetime;

  const ctaLabel = !session
    ? "Sign up"
    : plan.price === 0
      ? "Get Started"
      : isLifetime
        ? "Buy Lifetime Access"
        : isYearly
          ? "Subscribe Yearly"
          : "Subscribe Monthly";

  return (
    <div
      className={cn(
        "relative flex flex-col border p-8",
        isPopular
          ? "z-10 -mx-1 rounded-2xl border-white/20 bg-white py-12 text-black shadow-2xl"
          : "rounded-xl border-white/10 bg-white/5",
      )}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="bg-primary flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
            <Star className="size-3 fill-current" /> Most Popular
          </div>
        </div>
      )}

      <h3
        className={cn(
          "text-lg font-semibold",
          isPopular ? "text-black" : "text-white",
        )}
      >
        <span className="capitalize">{plan.name}</span>
      </h3>
      <p
        className={cn(
          "mt-1 text-sm",
          isPopular ? "text-black/60" : "text-white/50",
        )}
      >
        {plan.description}
      </p>

      <div className="mt-6 flex items-baseline gap-1">
        <span
          className={cn(
            "text-4xl font-bold",
            isPopular ? "text-black" : "text-white",
          )}
        >
          ${isLifetime ? plan.price : displayPrice}
        </span>
        {!isLifetime && plan.price > 0 && (
          <span className={isPopular ? "text-black/40" : "text-white/40"}>
            /mo
          </span>
        )}
        {isLifetime && (
          <span className={isPopular ? "text-black/40" : "text-white/40"}>
            once
          </span>
        )}
      </div>

      {isYearly && !isLifetime && yearlyPrice > 0 && (
        <p
          className={cn(
            "mt-1 text-sm",
            isPopular ? "text-black/40" : "text-white/30",
          )}
        >
          Billed ${yearlyPrice}/year
        </p>
      )}

      <ul className="mt-8 flex-1 space-y-3">
        {Object.entries(plan.limits)
          .filter(([key, value]) => {
            if (key === "prioritySupport" && !value) return false;
            return true;
          })
          .map(([key, value]) => {
            const limitConfig =
              LIMITS_CONFIG[key as keyof typeof LIMITS_CONFIG];

            return (
              <li key={key} className="flex items-center gap-2.5 text-sm">
                <Check
                  className={cn(
                    "size-4 shrink-0",
                    isPopular ? "text-primary" : "text-primary",
                  )}
                />
                <span className={isPopular ? "text-black/70" : "text-white/70"}>
                  {limitConfig.getLabel(value as number | boolean)}
                </span>
              </li>
            );
          })}
      </ul>

      <LoadingButton
        loading={false}
        size="lg"
        className={cn(
          "mt-8 w-full text-base font-medium shadow-sm",
          isPopular
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-transparent bg-white text-black hover:bg-white/90 hover:text-black focus-visible:ring-white/40",
        )}
        variant="default"
        onClick={handleClick}
      >
        {ctaLabel}
      </LoadingButton>
    </div>
  );
}
