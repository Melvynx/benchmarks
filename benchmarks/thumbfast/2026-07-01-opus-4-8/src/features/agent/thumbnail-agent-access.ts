import type { AuthRole } from "@/lib/auth/auth-permissions";

export type ThumbnailAgentAccessSettings = {
  role?: AuthRole | null;
  features?: {
    thumbnailAgentEnabled?: boolean;
  } | null;
};

export function canAccessThumbnailAgent(
  settings: ThumbnailAgentAccessSettings | undefined,
) {
  if (!settings?.features?.thumbnailAgentEnabled) return false;
  return settings.role === "admin" || settings.role === "owner";
}
