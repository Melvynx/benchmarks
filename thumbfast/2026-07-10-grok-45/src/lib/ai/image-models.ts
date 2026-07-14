export const IMAGE_MODELS = {
  "gemini-3-pro": {
    id: "gemini-3-pro",
    label: "Nano Banana Pro",
    shortLabel: "Pro",
    apiModelId: "gemini-3-pro-image-preview",
    provider: "google",
    creditCost: 1,
    pickerDetails: "1 token usage",
  },
  "gemini-3-pro-apiyi": {
    id: "gemini-3-pro-apiyi",
    label: "Nano Banana Pro (Efficient)",
    shortLabel: "Pro E",
    apiModelId: "gemini-3-pro-image-preview",
    provider: "apiyi",
    apiFormat: "gemini",
    creditCost: 1,
    pickerDetails: "1 token usage",
  },
  "gemini-3.1-flash": {
    id: "gemini-3.1-flash",
    label: "Nano Banana 2",
    shortLabel: "2",
    apiModelId: "gemini-3.1-flash-image-preview",
    provider: "google",
    default: true,
    creditCost: 0.8,
    pickerDetails: "0.8 tokens • recommended",
  },
  "gemini-3.1-flash-apiyi": {
    id: "gemini-3.1-flash-apiyi",
    label: "Nano Banana 2 (Efficient)",
    shortLabel: "2E",
    apiModelId: "gemini-3.1-flash-image-preview",
    provider: "apiyi",
    apiFormat: "gemini",
    creditCost: 0.8,
    pickerDetails: "0.8 tokens • recommended",
  },
  "gpt-image-2-apiyi": {
    id: "gpt-image-2-apiyi",
    label: "GPT Image 2 (Efficient)",
    shortLabel: "GPT E",
    apiModelId: "gpt-image-2",
    provider: "apiyi",
    apiFormat: "openai",
    creditCost: 1,
    pickerDetails: "1 token usage",
  },
  "gpt-image-2": {
    id: "gpt-image-2",
    label: "GPT Image 2",
    shortLabel: "GPT",
    apiModelId: "gpt-image-2",
    provider: "openai",
    creditCost: 1,
    pickerDetails: "1 token usage",
    pricing: {
      imageInputPer1MUsd: 8,
      imageCachedInputPer1MUsd: 2,
      imageOutputPer1MUsd: 30,
      textInputPer1MUsd: 5,
      textCachedInputPer1MUsd: 1.25,
      source: "https://openai.com/api/pricing/",
    },
  },
} as const;

export type ImageModel = keyof typeof IMAGE_MODELS;
export type ImageModelProvider = (typeof IMAGE_MODELS)[ImageModel]["provider"];
export type ImageGenerationApi = "apiyi" | "google" | "openai";
type CustomApiKeyAvailability = {
  openai?: boolean;
  gemini?: boolean;
  apiyi?: boolean;
};

type ImageModelRouteGroup = {
  official: ImageModel;
  apiyi: ImageModel;
};

const IMAGE_MODEL_ROUTE_GROUPS: ImageModelRouteGroup[] = [
  { official: "gemini-3-pro", apiyi: "gemini-3-pro-apiyi" },
  { official: "gemini-3.1-flash", apiyi: "gemini-3.1-flash-apiyi" },
  { official: "gpt-image-2", apiyi: "gpt-image-2-apiyi" },
];

const IMAGE_MODEL_ROUTE_BY_MODEL = Object.fromEntries(
  IMAGE_MODEL_ROUTE_GROUPS.flatMap((group) => [
    [group.official, group],
    [group.apiyi, group],
  ]),
) as Record<ImageModel, ImageModelRouteGroup | undefined>;

export const PUBLIC_IMAGE_MODEL_IDS = IMAGE_MODEL_ROUTE_GROUPS.map(
  (group) => group.official,
) as ImageModel[];

const LEGACY_MODEL_MAP: Record<string, ImageModel> = {
  gemini: "gemini-3-pro",
  "gemini-flash": "gemini-3.1-flash",
  "gpt-image": "gpt-image-2",
  "gpt-image-1.5": "gpt-image-2",
};

export function getDefaultModelId(): ImageModel {
  return "gemini-3.1-flash";
}

export function resolveModelId(id: string): ImageModel {
  if (id in IMAGE_MODELS) return id as ImageModel;
  if (id in LEGACY_MODEL_MAP) return LEGACY_MODEL_MAP[id];
  return getDefaultModelId();
}

export function getPublicModelId(model: string): ImageModel {
  const resolved = resolveModelId(model);
  return IMAGE_MODEL_ROUTE_BY_MODEL[resolved]?.official ?? resolved;
}

export function getOfficialImageModelId(model: string): ImageModel {
  const resolved = resolveModelId(model);
  return IMAGE_MODEL_ROUTE_BY_MODEL[resolved]?.official ?? resolved;
}

export function getPublicImageModels() {
  return PUBLIC_IMAGE_MODEL_IDS.map((id) => IMAGE_MODELS[id]);
}

export function getModelCreditCost(model: string): number {
  const resolved = resolveModelId(model);
  return IMAGE_MODELS[resolved].creditCost;
}

export function isOpenAiImageModel(model: string): boolean {
  const resolved = resolveModelId(model);
  return IMAGE_MODELS[resolved].provider === "openai";
}

export function isApiyiImageModel(model: string): boolean {
  const resolved = resolveModelId(model);
  return IMAGE_MODELS[resolved].provider === "apiyi";
}

export function isApiyiGeminiImageModel(model: string): boolean {
  const resolved = resolveModelId(model);
  const config = IMAGE_MODELS[resolved];
  return config.provider === "apiyi" && config.apiFormat === "gemini";
}

export function isApiyiOpenAiImageModel(model: string): boolean {
  const resolved = resolveModelId(model);
  const config = IMAGE_MODELS[resolved];
  return config.provider === "apiyi" && config.apiFormat === "openai";
}

export function getImageModelApi(model: ImageModel): ImageGenerationApi {
  const provider = IMAGE_MODELS[model].provider;
  if (provider === "apiyi") return "apiyi";
  if (provider === "openai") return "openai";
  return "google";
}

export function getImageModelRoute(
  model: string,
  forceOfficialFirst: boolean,
): ImageModel[] {
  const resolved = resolveModelId(model);
  const group = IMAGE_MODEL_ROUTE_BY_MODEL[resolved];
  if (!group) return [resolved];
  return forceOfficialFirst
    ? [group.official, group.apiyi]
    : [group.apiyi, group.official];
}

export function getImageModelRouteForGeneration(
  model: string,
  options: {
    forceOfficialFirst: boolean;
    useCustomApiKeys: boolean;
    useManagedRouteWithCustomApiKeys?: boolean;
    customApiKeyAvailability?: CustomApiKeyAvailability;
  },
): ImageModel[] {
  const route =
    options.useCustomApiKeys && !options.useManagedRouteWithCustomApiKeys
      ? [getOfficialImageModelId(model)]
      : getImageModelRoute(model, options.forceOfficialFirst);

  const customApiKeyAvailability = options.customApiKeyAvailability;
  if (!options.useCustomApiKeys || !customApiKeyAvailability) {
    return route;
  }

  const filteredRoute = route.filter((routeModel) =>
    hasCustomApiKeyForImageModel(routeModel, customApiKeyAvailability),
  );
  return filteredRoute.length > 0 ? filteredRoute : route;
}

export function getDefaultRouteModel(
  model: string,
  forceOfficialFirst: boolean,
): ImageModel {
  return (
    getImageModelRoute(model, forceOfficialFirst)[0] ?? resolveModelId(model)
  );
}

export function modelHasApiyiRoute(model: string): boolean {
  return Boolean(IMAGE_MODEL_ROUTE_BY_MODEL[resolveModelId(model)]);
}

function hasCustomApiKeyForImageModel(
  model: ImageModel,
  keys: CustomApiKeyAvailability,
) {
  const provider = IMAGE_MODELS[model].provider;
  if (provider === "apiyi") return Boolean(keys.apiyi);
  if (provider === "openai") return Boolean(keys.openai);
  return Boolean(keys.gemini);
}

export const getModelLabel = (model: string | null): string | null => {
  if (!model) return null;
  const resolved = resolveModelId(model);
  return IMAGE_MODELS[resolved].label;
};
