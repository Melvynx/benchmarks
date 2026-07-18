import type { ImageModel } from "@/lib/ai/image-models";
import {
  IMAGE_MODELS,
  getModelCreditCost,
  isOpenAiImageModel,
  modelHasApiyiRoute,
} from "@/lib/ai/image-models";

type ApiKeyMode = "disabled" | "fallback" | "required";

type HasCustomApiKeys = {
  openai: boolean;
  gemini: boolean;
  apiyi?: boolean;
};

type CanGenerateParams = {
  balance: number | undefined;
  apiKeyMode: ApiKeyMode | undefined;
  hasCustomApiKeys: HasCustomApiKeys | undefined;
  model: ImageModel;
  thumbnailCount: number;
};

function hasApiKeyForModel(keys: HasCustomApiKeys, model: ImageModel): boolean {
  if (keys.apiyi && modelHasApiyiRoute(model)) return true;
  if (isOpenAiImageModel(model)) return keys.openai;
  if (IMAGE_MODELS[model].provider === "apiyi") return false;
  return keys.gemini;
}

export function canUseApiKeys(params: {
  apiKeyMode: ApiKeyMode | undefined;
  hasCustomApiKeys: HasCustomApiKeys | undefined;
  model: ImageModel;
}): boolean {
  const { apiKeyMode, hasCustomApiKeys, model } = params;
  if (!apiKeyMode || apiKeyMode === "disabled") return false;
  if (!hasCustomApiKeys) return false;
  return hasApiKeyForModel(hasCustomApiKeys, model);
}

export function canGenerate(params: CanGenerateParams) {
  const apiKeysAvailable = canUseApiKeys(params);
  const managedProviderAvailable =
    params.apiKeyMode === "required" &&
    IMAGE_MODELS[params.model].provider === "apiyi";
  const creditCost = getModelCreditCost(params.model) * params.thumbnailCount;
  const hasEnoughCredits = (params.balance ?? 0) >= creditCost;

  return {
    canUseApiKeys: apiKeysAvailable,
    hasEnoughCredits:
      apiKeysAvailable || managedProviderAvailable || hasEnoughCredits,
    isOutOfCredits:
      !apiKeysAvailable &&
      !managedProviderAvailable &&
      (params.balance ?? 0) <= 0,
  };
}
