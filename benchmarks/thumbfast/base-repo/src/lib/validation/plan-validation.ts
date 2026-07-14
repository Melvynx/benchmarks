/**
 * Plan validation utilities
 * Used across API keys, billing, and other plan-gated features
 */

import { ActionError } from "@/lib/errors/action-error";

export type PlanType = string | null | undefined;

/**
 * API Key Mode determines how custom API keys are used for generation
 *
 * - "disabled": Free plan - cannot use custom API keys
 * - "fallback": Pro/Ultra plan - uses credits first, custom keys when credits run out
 * - "required": Poweruser plan - ONLY uses custom API keys (no credits)
 */
export type ApiKeyMode = "disabled" | "fallback" | "required";

/**
 * Plans that require custom API keys (no credits system)
 */
const PLANS_REQUIRING_CUSTOM_API_KEYS = ["poweruser"] as const;

/**
 * Checks if the plan is a paid plan (not free)
 */
export function isPaidPlan(plan: PlanType): boolean {
  return Boolean(plan && plan !== "free");
}

/**
 * Checks if the plan requires custom API keys (no credits system)
 */
export function isPlanRequiringCustomApiKeys(plan: PlanType): boolean {
  return PLANS_REQUIRING_CUSTOM_API_KEYS.includes(
    plan as (typeof PLANS_REQUIRING_CUSTOM_API_KEYS)[number],
  );
}

/**
 * Get the API key mode for a given plan
 *
 * @returns ApiKeyMode indicating how custom API keys should be used
 */
export function getApiKeyMode(plan: PlanType): ApiKeyMode {
  if (!isPaidPlan(plan)) {
    return "disabled";
  }

  if (isPlanRequiringCustomApiKeys(plan)) {
    return "required";
  }

  return "fallback";
}

/**
 * Validates that the user has a paid plan
 * @throws ActionError if user is on free plan
 */
export function requirePaidPlan(
  plan: PlanType,
  featureName = "This feature",
): void {
  if (!isPaidPlan(plan)) {
    throw new ActionError(
      `${featureName} is only available for Pro and Ultra plans.`,
    );
  }
}

/**
 * Validates that the user has a paid plan for custom API keys
 * @throws ActionError if user is on free plan
 */
export function requirePaidPlanForApiKeys(plan: PlanType): void {
  requirePaidPlan(plan, "Custom API keys");
}

/**
 * Validates that a user on "required" API key mode has custom API keys configured
 * @throws ActionError if poweruser plan without API keys
 */
export function requireCustomApiKeysIfNeeded(
  apiKeyMode: ApiKeyMode,
  hasCustomApiKey: boolean,
): void {
  if (apiKeyMode === "required" && !hasCustomApiKey) {
    throw new ActionError(
      "Your plan requires custom API keys. Please add your OpenAI or Gemini API key in Settings > API Keys to generate thumbnails.",
    );
  }
}
