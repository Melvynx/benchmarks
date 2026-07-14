export const TEXT_MODELS = {
  "gemini-3.1-flash-lite": {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite",
    shortLabel: "Gemini Flash-Lite",
    pickerDetails: "Lowest cost",
    provider: "google",
    apiModelId: "gemini-3.1-flash-lite",
    default: true,
  },
  "gpt-5.4-mini": {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    shortLabel: "GPT-5.4 mini",
    pickerDetails: "OpenAI low cost",
    provider: "openai",
    apiModelId: "gpt-5.4-mini",
  },
} as const;

export type TextModelId = keyof typeof TEXT_MODELS;
export type TextModelProvider = (typeof TEXT_MODELS)[TextModelId]["provider"];

const LEGACY_TEXT_MODEL_MAP: Record<string, TextModelId> = {
  "gpt-54-mini": "gpt-5.4-mini",
  "gpt-5-4-mini": "gpt-5.4-mini",
  "gemini-3.1-flash-lite-preview": "gemini-3.1-flash-lite",
};

export const RUNTIME_TEXT_MODEL = "gemini-3.1-flash-lite" as const;

export function getDefaultTextModelId(): TextModelId {
  return RUNTIME_TEXT_MODEL;
}

export function resolveTextModelId(model?: string | null): TextModelId {
  if (model && model in TEXT_MODELS) return model as TextModelId;
  if (model && model in LEGACY_TEXT_MODEL_MAP) {
    return LEGACY_TEXT_MODEL_MAP[model];
  }
  return getDefaultTextModelId();
}

export function getPublicTextModels() {
  return Object.values(TEXT_MODELS);
}
