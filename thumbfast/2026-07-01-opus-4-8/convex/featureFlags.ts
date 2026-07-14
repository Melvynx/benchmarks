import { THUMBNAIL_AGENT_FEATURE_FLAG_KEY } from "./app/shared";

export const WATERMARK_FEATURE_FLAG_KEY = "watermark";

export type FeatureFlagDefinition = {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
};

// Single source of truth for product/platform feature flags. Every flag listed
// here always appears in the admin Feature Flags view (even before a DB row
// exists), so admins toggle a known flag instead of typing a free-text key.
// `defaultEnabled` mirrors the reader's fallback (e.g. getWatermarkEnabled,
// isThumbnailAgentEnabled) so the admin view matches runtime behavior.
export const FEATURE_FLAG_REGISTRY: FeatureFlagDefinition[] = [
  {
    key: THUMBNAIL_AGENT_FEATURE_FLAG_KEY,
    label: "Thumbnail Agent (beta)",
    description: "Admin beta: YouTube URL to auto-generated thumbnails.",
    defaultEnabled: false,
  },
  {
    key: WATERMARK_FEATURE_FLAG_KEY,
    label: "Free-plan watermark",
    description: "Watermark thumbnails on the free plan.",
    defaultEnabled: true,
  },
];
