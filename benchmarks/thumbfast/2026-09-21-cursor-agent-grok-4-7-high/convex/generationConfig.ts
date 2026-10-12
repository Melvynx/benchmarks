export const INITIAL_FREE_CREDITS = 5;

export const IMAGE_MODEL_CONFIG = {
  "gemini-3-pro": {
    provider: "gemini",
    creditCost: 1,
  },
  "gemini-3-pro-apiyi": {
    provider: "apiyi",
    creditCost: 1,
  },
  "gemini-3.1-flash": {
    provider: "gemini",
    creditCost: 0.8,
  },
  "gemini-3.1-flash-apiyi": {
    provider: "apiyi",
    creditCost: 0.8,
  },
  "gpt-image-2-apiyi": {
    provider: "apiyi",
    creditCost: 1,
  },
  "gpt-image-2": {
    provider: "openai",
    creditCost: 1,
  },
} as const;

export type ConvexImageModel = keyof typeof IMAGE_MODEL_CONFIG;
export type ConvexImageProvider =
  (typeof IMAGE_MODEL_CONFIG)[ConvexImageModel]["provider"];
export type ApiKeyMode = "disabled" | "fallback" | "required";

type ConvexImageModelRouteGroup = {
  official: ConvexImageModel;
  apiyi: ConvexImageModel;
};

const IMAGE_MODEL_ROUTE_GROUPS: ConvexImageModelRouteGroup[] = [
  { official: "gemini-3-pro", apiyi: "gemini-3-pro-apiyi" },
  { official: "gemini-3.1-flash", apiyi: "gemini-3.1-flash-apiyi" },
  { official: "gpt-image-2", apiyi: "gpt-image-2-apiyi" },
];

const IMAGE_MODEL_ROUTE_BY_MODEL = Object.fromEntries(
  IMAGE_MODEL_ROUTE_GROUPS.flatMap((group) => [
    [group.official, group],
    [group.apiyi, group],
  ]),
) as Record<ConvexImageModel, ConvexImageModelRouteGroup | undefined>;

const LEGACY_MODEL_MAP: Record<string, ConvexImageModel> = {
  gemini: "gemini-3-pro",
  "gemini-flash": "gemini-3.1-flash",
  "gpt-image": "gpt-image-2",
  "gpt-image-1.5": "gpt-image-2",
};

const DEFAULT_LIMITS = {
  credits: 5,
  maxGenerations: 2,
  maxInspirations: 10,
  maxPersons: 2,
  prioritySupport: false,
  gptImageAccess: false,
  noWatermark: false,
};

const PAID_LIMITS = {
  credits: 150,
  maxGenerations: 4,
  maxInspirations: 1000,
  maxPersons: 1000,
  prioritySupport: true,
  gptImageAccess: true,
  noWatermark: true,
};

const PLAN_LIMITS = {
  free: DEFAULT_LIMITS,
  pro: PAID_LIMITS,
  ultra: {
    ...PAID_LIMITS,
    credits: 500,
  },
  poweruser: {
    ...PAID_LIMITS,
    credits: 0,
  },
} as const;

export function resolveConvexImageModel(model: string): ConvexImageModel {
  if (model in IMAGE_MODEL_CONFIG) return model as ConvexImageModel;
  return LEGACY_MODEL_MAP[model] ?? "gemini-3.1-flash";
}

export function getConvexModelCreditCost(model: string): number {
  return IMAGE_MODEL_CONFIG[resolveConvexImageModel(model)].creditCost;
}

export function getConvexModelProvider(model: string): ConvexImageProvider {
  return IMAGE_MODEL_CONFIG[resolveConvexImageModel(model)].provider;
}

export function getConvexModelRoute(
  model: string,
  forceOfficialFirst: boolean,
): ConvexImageModel[] {
  const resolved = resolveConvexImageModel(model);
  const group = IMAGE_MODEL_ROUTE_BY_MODEL[resolved];
  if (!group) return [resolved];
  return forceOfficialFirst
    ? [group.official, group.apiyi]
    : [group.apiyi, group.official];
}

export function getConvexDefaultRouteModel(
  model: string,
  forceOfficialFirst: boolean,
): ConvexImageModel {
  return (
    getConvexModelRoute(model, forceOfficialFirst)[0] ??
    resolveConvexImageModel(model)
  );
}

export function getConvexOfficialRouteModel(model: string): ConvexImageModel {
  const resolved = resolveConvexImageModel(model);
  return IMAGE_MODEL_ROUTE_BY_MODEL[resolved]?.official ?? resolved;
}

export function modelHasManagedApiyiRoute(model: string): boolean {
  return Boolean(IMAGE_MODEL_ROUTE_BY_MODEL[resolveConvexImageModel(model)]);
}

export function getPlanLimitsForPlan(plan?: string | null) {
  return getPlanLimitsWithOverrides(plan);
}

export function getPlanLimitsWithOverrides(
  plan?: string | null,
  overrideLimits?: Partial<typeof DEFAULT_LIMITS> | null,
) {
  const normalizedPlan =
    plan === "pro" || plan === "ultra" || plan === "poweruser" ? plan : "free";
  const baseLimits = PLAN_LIMITS[normalizedPlan];

  if (!overrideLimits) return baseLimits;

  return {
    ...baseLimits,
    ...overrideLimits,
  };
}

export function getApiKeyModeForPlan(plan?: string | null): ApiKeyMode {
  if (!plan || plan === "free") return "disabled";
  if (plan === "poweruser") return "required";
  return "fallback";
}
