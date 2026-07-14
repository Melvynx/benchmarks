import {
  Banana,
  Droplet,
  Headset,
  ImageIcon,
  Images,
  Sparkles,
  User,
} from "lucide-react";

type Subscription = {
  id?: string;
  plan?: string;
  status?: string | null;
};

/**
 * Threshold for displaying "Unlimited" instead of a number
 * Values >= this threshold are considered unlimited
 */
export const UNLIMITED_THRESHOLD = 1000;

const DEFAULT_LIMIT = {
  credits: 5,
  maxGenerations: 2,
  maxInspirations: 10,
  maxPersons: 2,
  prioritySupport: false,
  gptImageAccess: false,
  noWatermark: false,
};

export type PlanLimit = typeof DEFAULT_LIMIT;

export type OverrideLimits = Partial<PlanLimit>;

export const TRIAL_LIMITS: PlanLimit = {
  credits: 10,
  maxGenerations: 4,
  maxInspirations: 1000,
  maxPersons: 1000,
  prioritySupport: false,
  gptImageAccess: true,
  noWatermark: true,
};

type HookCtx = {
  req: Request;
  organizationId: string;
  stripeCustomerId: string;
  subscriptionId: string;
};

export type AppAuthPlan = {
  priceId?: string | undefined;
  lookupKey?: string | undefined;
  annualDiscountPriceId?: string | undefined;
  annualDiscountLookupKey?: string | undefined;
  name: string;
  group?: string;
  freeTrial?: {
    days: number;
    onTrialStart?: (subscription: Subscription, ctx: HookCtx) => Promise<void>;
    onTrialEnd?: (
      data: {
        subscription: Subscription;
      },
      ctx: HookCtx,
    ) => Promise<void>;
    onTrialExpired?: (
      subscription: Subscription,
      ctx: HookCtx,
    ) => Promise<void>;
  };
  onSubscriptionCanceled?: (
    subscription: Subscription,
    ctx: HookCtx,
  ) => Promise<void>;
} & {
  description: string;
  isPopular?: boolean;
  price: number;
  yearlyPrice?: number;
  currency: string;
  isHidden?: boolean;
  isLifetime?: boolean;
  limits: PlanLimit;
};

export const AUTH_PLANS: AppAuthPlan[] = [
  {
    name: "free",
    description: "Get started with basic thumbnail generation",
    limits: DEFAULT_LIMIT,
    price: 0,
    currency: "USD",
    yearlyPrice: 0,
  },
  {
    name: "pro",
    isPopular: true,
    description: "For regular creators who need more thumbnails",
    priceId: process.env.STRIPE_PRO_PLAN_ID ?? "",
    annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PLAN_ID ?? "",
    limits: {
      credits: 150,
      maxGenerations: 4,
      maxInspirations: 1000,
      maxPersons: 1000,
      prioritySupport: true,
      gptImageAccess: true,
      noWatermark: true,
    },
    price: 20,
    yearlyPrice: 199,
    currency: "USD",
  },
  {
    name: "ultra",
    isPopular: false,
    description: "Maximum thumbnails for power users",
    priceId: process.env.STRIPE_ULTRA_PLAN_ID ?? "",
    annualDiscountPriceId: process.env.STRIPE_ULTRA_YEARLY_PLAN_ID ?? "",
    limits: {
      credits: 500,
      maxGenerations: 4,
      maxInspirations: 1000,
      maxPersons: 1000,
      prioritySupport: true,
      gptImageAccess: true,
      noWatermark: true,
    },
    price: 49,
    yearlyPrice: 499,
    currency: "USD",
  },
  {
    name: "poweruser",
    isPopular: false,
    isLifetime: true,
    description: "One-time payment, unlimited access with your own API keys",
    priceId: process.env.STRIPE_POWERUSER_PRICE_ID ?? "",
    limits: {
      credits: 0,
      maxGenerations: 4,
      maxInspirations: 1000,
      maxPersons: 1000,
      prioritySupport: true,
      gptImageAccess: true,
      noWatermark: true,
    },
    price: 199,
    currency: "USD",
  },
];

export const LIMITS_CONFIG: Record<
  keyof PlanLimit,
  {
    icon: React.ElementType;
    getLabel: (value: number | boolean) => string;
    description: string | ((value: number | boolean) => string);
  }
> = {
  credits: {
    icon: ImageIcon,
    getLabel: (value) =>
      value === 0
        ? "Use your own API keys"
        : Number(value) >= 100
          ? `${value} thumbnails/month`
          : `${value} thumbnails included`,
    description: (value: number | boolean) =>
      Number(value) >= 100
        ? "AI-generated thumbnails every month"
        : "One-time thumbnails, no renewal",
  },
  maxGenerations: {
    icon: Images,
    getLabel: (value) => `Up to ${value} thumbnails at once`,
    description: "Generate multiple variations per request",
  },
  maxInspirations: {
    icon: Sparkles,
    getLabel: (value) =>
      Number(value) >= UNLIMITED_THRESHOLD
        ? "Unlimited inspirations"
        : `${value} inspirations`,
    description: "Save inspiration thumbnails for reference",
  },
  maxPersons: {
    icon: User,
    getLabel: (value) =>
      Number(value) >= UNLIMITED_THRESHOLD
        ? "Unlimited persons"
        : `${value} persons`,
    description: "Add reference persons for thumbnail generation",
  },
  prioritySupport: {
    icon: Headset,
    getLabel: (value) => (value ? "Priority support via live chat" : ""),
    description: "Get help faster with dedicated support",
  },
  gptImageAccess: {
    icon: Banana,
    getLabel: (value) =>
      value ? "Gemini + OpenAI models" : "Gemini model only",
    description: (value: number | boolean) =>
      value
        ? "Access to both Gemini and OpenAI image generation"
        : "Generate thumbnails with Google's Gemini AI",
  },
  noWatermark: {
    icon: Droplet,
    getLabel: (value) =>
      value ? "No watermark on exports" : "thumbfa.st watermark on exports",
    description: (value: number | boolean) =>
      value
        ? "Download clean, unbranded thumbnails"
        : "Free-tier exports include a small thumbfa.st wordmark",
  },
};

export const getPlanLimits = (
  plan = "free",
  overrideLimits?: OverrideLimits | null,
): PlanLimit => {
  const planLimits = AUTH_PLANS.find((p) => p.name === plan)?.limits;

  const baseLimits = planLimits ?? DEFAULT_LIMIT;

  if (!overrideLimits) {
    return baseLimits;
  }

  return {
    ...baseLimits,
    ...overrideLimits,
  };
};

export const getPlanFeatures = (plan: AppAuthPlan): string[] => {
  return Object.entries(plan.limits)
    .filter(([key]) => key in LIMITS_CONFIG)
    .map(([key, value]) => {
      const limitConfig = LIMITS_CONFIG[key as keyof typeof LIMITS_CONFIG];
      return limitConfig.getLabel(value as number);
    });
};

export type CreditPack = {
  id: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  priceId: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "thumbnails_10",
    credits: 10,
    price: 2.99,
    pricePerCredit: 0.299,
    priceId: process.env.STRIPE_CREDITS_10_PRICE_ID ?? "",
  },
  {
    id: "thumbnails_50",
    credits: 50,
    price: 12.99,
    pricePerCredit: 0.26,
    priceId: process.env.STRIPE_CREDITS_50_PRICE_ID ?? "",
  },
  {
    id: "thumbnails_150",
    credits: 150,
    price: 34.99,
    pricePerCredit: 0.233,
    priceId: process.env.STRIPE_CREDITS_150_PRICE_ID ?? "",
  },
];
