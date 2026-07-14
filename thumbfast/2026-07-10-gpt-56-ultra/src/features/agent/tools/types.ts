import type { PlanType } from "@/lib/validation/plan-validation";

export type ToolContext = {
  request: Request;
  orgId: string;
  orgSlug: string;
  plan: PlanType;
};

export type GenerateParams = {
  prompt: string;
  personIds?: string[];
  inspirationIds?: string[];
  imageIds?: string[];
  model?: string;
  baseImageUrl?: string;
  editPrompt?: string;
  promptId?: string;
  source: string;
};

export type GenerateResult =
  | {
      success: true;
      thumbnailUrl: string | null;
      promptId: string;
      generationId: string;
      thumbnailId: string;
    }
  | { success: false; error: string };

export type BatchThumbnailResult = {
  success: boolean;
  thumbnailUrl?: string;
  promptId?: string;
  generationId: string;
  prompt: string;
  error?: string;
};

export type GenerateBatchResult =
  | {
      success: true;
      promptId: string;
      thumbnails: BatchThumbnailResult[];
    }
  | { success: false; error: string };
