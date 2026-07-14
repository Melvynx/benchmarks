# Thumbnail & API Key Usage Rules

## Plans Overview

| Plan          | Monthly Thumbnails    | API Key Mode | Behavior                                                                                        |
| ------------- | --------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| **Free**      | 5 initial thumbnails  | `disabled`   | ONLY uses platform thumbnails. Cannot use custom API keys.                                      |
| **Pro**       | 150 thumbnails/month  | `fallback`   | Uses included thumbnails first. When they run out, falls back to custom API keys if configured. |
| **Ultra**     | 500 thumbnails/month  | `fallback`   | Same as Pro but more thumbnails.                                                                |
| **Poweruser** | 0 lifetime thumbnails | `required`   | ONLY uses custom API keys. No included thumbnails.                                              |

## Core Rules

### 1. FREE users can ONLY use included thumbnails

- Free users get 5 initial thumbnails
- Every generated image uses thumbnails from the plan allowance
- When included thumbnails run out, they must upgrade or buy thumbnail packs
- They CANNOT configure or use custom API keys

### 2. PRO/ULTRA users use included thumbnails first, API keys as fallback

- PRO gets 150 thumbnails/month, ULTRA gets 500 thumbnails/month
- When they have included thumbnails -> use platform API keys
- When included thumbnails run out -> use their custom API keys (if configured)
- When included thumbnails run out AND no custom API keys -> show "insufficient thumbnails" error

### 3. POWERUSER only uses custom API keys

- No credits at all
- Must configure their own API keys (OpenAI and/or Gemini)
- If no API key configured -> show "API key required" error

## Implementation

### Credit validation flow

Every AI action MUST follow this pattern:

```typescript
// 1. Validate credits/API key mode
const { shouldDeductCredits } = await validateCreditForFeature({
  orgId: ctx.org.id,
  plan: ctx.org.subscription?.plan,
  creditCost: CREDIT_COST,
  featureName: "feature name",
});

// 2. Only get custom API keys when NOT using credits
let customApiKey: string | undefined;
if (!shouldDeductCredits) {
  const customApiKeys = await getOrgApiKeys(ctx.org.id);
  customApiKey = customApiKeys.geminiApiKey;
}

// 3. Call AI function (uses platform key when customApiKey is undefined)
const result = await someAiFunction(input, customApiKey);

// 4. Log custom API key usage ONLY if custom key was used
if (customApiKey) {
  await logCustomApiKeyUsage(
    ctx.org.id,
    "gemini",
    "gemini-3.1-flash-lite-preview",
  );
}

// 5. Deduct credits ONLY if using platform key
if (shouldDeductCredits) {
  await deductCredits(ctx.org.id, CREDIT_COST, "transaction_type");
}
```

### For image generation (with model selection)

```typescript
const { shouldDeductCredits } = await validateCreditOrApiKey({
  orgId: ctx.org.id,
  plan: ctx.org.subscription?.plan,
  creditCost: totalCreditsNeeded,
  model: parsedInput.model,
});

let customApiKeys: CustomApiKeys | undefined;
if (!shouldDeductCredits) {
  customApiKeys = await getOrgApiKeys(ctx.org.id);
}

await generateThumbnail({ ..., customApiKeys });
```

### Key functions

| Function                   | Location                                    | Purpose                                             |
| -------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `validateCreditOrApiKey`   | `src/features/credits/credit-validation.ts` | For image generation (supports model-specific keys) |
| `validateCreditForFeature` | `src/features/credits/credit-validation.ts` | For text AI features (enhance, describe, auto-name) |
| `getApiKeyMode`            | `src/lib/validation/plan-validation.ts`     | Returns `disabled`, `fallback`, or `required`       |
| `getOrgApiKeys`            | `src/lib/organizations/get-org.ts`          | Fetches and decrypts org's custom API keys          |

### Credit costs

| Action               | Cost            | Constant                            |
| -------------------- | --------------- | ----------------------------------- |
| Image generation     | Model-dependent | `getModelCreditCost(model)`         |
| Prompt enhancement   | 0.1             | `CREDIT_COST_PER_ENHANCE`           |
| Inspiration analysis | 0.1             | `CREDIT_COST_PER_INSPIRATION`       |
| Auto-name            | 0.1             | `CREDIT_COST_PER_AUTO_NAME`         |
| Image description    | 0.05            | `CREDIT_COST_PER_IMAGE_DESCRIPTION` |
| Anonymization        | 1               | `CREDIT_COST_PER_ANONYMIZATION`     |
| Agent chat           | 0.2             | `CREDIT_COST_PER_AGENT_CHAT`        |

## CRITICAL: Never pass custom API keys when user has credits

When `shouldDeductCredits` is `true`, it means the user has credits and should use the platform key. NEVER call `getOrgApiKeys()` in this case - it would bypass the platform key and use whatever (potentially invalid) key the user has stored.
