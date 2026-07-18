import { uploadBufferToS3 } from "../aws/aws-s3-upload-files";
import { logger } from "../logger";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { lookup } from "dns/promises";
import { readdirSync } from "fs";
import { isIP } from "net";
import OpenAI, { toFile } from "openai";
import { join } from "path";

import { promptMentionsToAiFormat } from "../prompt-mentions";
import { nanoid } from "nanoid";
import {
  IMAGE_MODELS,
  getDefaultModelId,
  getImageModelApi,
  getImageModelRouteForGeneration,
  isApiyiGeminiImageModel,
  isApiyiImageModel,
  isApiyiOpenAiImageModel,
  isOpenAiImageModel,
  resolveModelId,
} from "./image-models";
import type { ImageModel } from "./image-models";
import { ASPECT_RATIO_CONFIG } from "./aspect-ratio";
import type { AspectRatio } from "./aspect-ratio";
import { cropToAspectRatio } from "./crop-image";
import { createCloudflareWatermarkedImage } from "./watermark";
import { upfetch } from "../up-fetch";
import { z } from "zod";

const MAX_REFERENCE_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_PROVIDER_TIMEOUT_MS = 5 * 60 * 1000;

type UserImageData = {
  id: string;
  imageUrl: string;
  name: string;
  description: string | null;
};

export {
  ASPECT_RATIO_CONFIG,
  getAspectRatioClass,
  parseAspectRatio,
} from "./aspect-ratio";
export type { AspectRatio } from "./aspect-ratio";

function cleanPromptForAI(prompt: string): string {
  return promptMentionsToAiFormat(prompt);
}

function safeGenerationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[redacted-key]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-key]")
    .replace(/https?:\/\/\S+/g, "[redacted-url]")
    .split("\n")[0]
    .slice(0, 300);
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

async function withTimeout<T>(
  label: string,
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await run(controller.signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(
        `${label} timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export { IMAGE_MODELS, type ImageModel } from "./image-models";

export type CustomApiKeys = {
  openaiApiKey?: string;
  geminiApiKey?: string;
  apiyiApiKey?: string;
};
type CustomKeyProvider = "openai" | "gemini" | "apiyi";
type CustomKeyUsageMarker = (provider: CustomKeyProvider) => void;

export type ImageGenerationRoutingAttempt = {
  model: string;
  provider: string;
  api: string;
  apiModelId: string;
  status: "succeeded" | "failed";
  durationMs: number;
  error?: string;
  customKeyProvider?: CustomKeyProvider;
};

export type GenerateImageParams = {
  prompt: string;
  orgId: string;
  personDescriptions?: string[];
  personImages?: string[];
  inspirationDescription?: string;
  inspirationImages?: string[];
  userImages?: UserImageData[];
  baseImageUrl?: string;
  editPrompt?: string;
  model?: ImageModel;
  aspectRatio?: AspectRatio;
  hasPlaceholderMannequin?: boolean;
  hasAnonymizedTextPlaceholders?: boolean;
  hasAnonymizedLogoPlaceholders?: boolean;
  customApiKeys?: CustomApiKeys;
  applyWatermark?: boolean;
  routingDefaultModel?: string;
  routingForceOfficialFirst?: boolean;
};

export type GenerateImageResult =
  | {
      success: true;
      url: string;
      watermarkedUrl?: string;
      generationTimeMs: number;
      model: string;
      requestedModel: string;
      routingDefaultModel: string;
      routingFinalProvider: string;
      routingFinalApi: string;
      routingFinalApiModelId: string;
      routingFallbackUsed: boolean;
      routingAttempts: ImageGenerationRoutingAttempt[];
    }
  | {
      success: false;
      error: string;
      requestedModel?: string;
      routingDefaultModel?: string;
      routingAttempts?: ImageGenerationRoutingAttempt[];
    };

function getFakeThumbnailUrl(): string {
  const files = readdirSync(join(process.cwd(), "public/landing")).filter((f) =>
    f.startsWith("gen-"),
  );
  const file = files[Math.floor(Math.random() * files.length)];
  const appUrl =
    process.env.VITE_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:9150";
  return `${appUrl}/landing/${file}`;
}

export async function generateThumbnail(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  if (process.env.FAKE_GENERATION === "true") {
    logger.info(`[Generation] FAKE_GENERATION enabled — skipping AI call`);
    return {
      success: true,
      url: getFakeThumbnailUrl(),
      generationTimeMs: 50,
      model: "fake",
      requestedModel: "fake",
      routingDefaultModel: "fake",
      routingFinalProvider: "fake",
      routingFinalApi: "apiyi",
      routingFinalApiModelId: "fake",
      routingFallbackUsed: false,
      routingAttempts: [
        {
          model: "fake",
          provider: "fake",
          api: "apiyi",
          apiModelId: "fake",
          status: "succeeded",
          durationMs: 50,
        },
      ],
    };
  }

  // Clean mentions from prompt before sending to AI
  const cleanedParams: GenerateImageParams = {
    ...params,
    prompt: cleanPromptForAI(params.prompt),
    editPrompt: params.editPrompt
      ? cleanPromptForAI(params.editPrompt)
      : undefined,
  };

  const requestedModel = resolveModelId(params.model ?? getDefaultModelId());
  const useManagedRouteWithCustomApiKeys = Boolean(
    params.customApiKeys?.apiyiApiKey,
  );
  const route = getImageModelRouteForGeneration(requestedModel, {
    forceOfficialFirst: Boolean(params.routingForceOfficialFirst),
    useCustomApiKeys: Boolean(params.customApiKeys),
    useManagedRouteWithCustomApiKeys,
    customApiKeyAvailability: params.customApiKeys
      ? {
          openai: Boolean(params.customApiKeys.openaiApiKey),
          gemini: Boolean(params.customApiKeys.geminiApiKey),
          apiyi: Boolean(params.customApiKeys.apiyiApiKey),
        }
      : undefined,
  });
  const routingDefaultModel = route[0] ?? requestedModel;

  logger.info(
    `[Generation] Starting ${requestedModel} generation for org ${params.orgId}`,
    {
      route,
      routingDefaultModel,
      forceOfficialFirst: Boolean(params.routingForceOfficialFirst),
    },
  );
  const startTime = Date.now();
  const routingAttempts: ImageGenerationRoutingAttempt[] = [];

  try {
    const { imageBuffer, model, modelConfig } = await generateWithRoute({
      params: cleanedParams,
      route,
      customApiKeys: params.customApiKeys,
      routingAttempts,
    });

    const aspectRatio = params.aspectRatio ?? "16:9";
    const cropped = await cropToAspectRatio(
      imageBuffer.buffer,
      imageBuffer.mediaType,
      aspectRatio,
    );

    const cleanFileName = `${Date.now()}-${nanoid(10)}`;
    const watermarkedFileName = `${Date.now()}-${nanoid(10)}-wm`;
    const prefix = `generations/${params.orgId}`;

    const url = await uploadBufferToS3({
      buffer: cropped.buffer,
      prefix,
      fileName: cleanFileName,
      contentType: cropped.mediaType,
    });

    if (!url) {
      logger.error(`[Generation] Failed to upload image to S3`);
      return {
        success: false,
        error: "Failed to upload image",
        requestedModel,
        routingDefaultModel,
        routingAttempts,
      };
    }

    const watermarkedUrl = params.applyWatermark
      ? await createCloudflareWatermarkedImage({
          sourceUrl: url,
          outputKey: `${prefix}/${watermarkedFileName}.${cropped.mediaType.split("/")[1] ?? "png"}`,
          contentType: cropped.mediaType,
          width: cropped.width,
          height: cropped.height,
        })
      : undefined;

    if (params.applyWatermark && !watermarkedUrl) {
      logger.error(
        `[Generation] Watermark upload failed - failing generation to prevent paywall bypass`,
      );
      return {
        success: false,
        error: "Failed to apply watermark",
        requestedModel,
        routingDefaultModel,
        routingAttempts,
      };
    }

    const totalTime = Date.now() - startTime;
    logger.info(
      `[Generation] Successfully generated and uploaded in ${totalTime}ms: ${url}${watermarkedUrl ? ` (+ watermarked: ${watermarkedUrl})` : ""}`,
    );

    return {
      success: true,
      url,
      watermarkedUrl: watermarkedUrl ?? undefined,
      generationTimeMs: totalTime,
      model,
      requestedModel,
      routingDefaultModel,
      routingFinalProvider: modelConfig.provider,
      routingFinalApi: getImageModelApi(model),
      routingFinalApiModelId: modelConfig.apiModelId,
      routingFallbackUsed: routingAttempts.length > 1,
      routingAttempts,
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error(`[Generation] Failed after ${totalTime}ms`, {
      error: safeGenerationError(error),
    });
    return {
      success: false,
      error: safeGenerationError(error),
      requestedModel,
      routingDefaultModel,
      routingAttempts,
    };
  }
}

async function generateWithRoute(params: {
  params: GenerateImageParams;
  route: ImageModel[];
  customApiKeys?: CustomApiKeys;
  routingAttempts: ImageGenerationRoutingAttempt[];
}): Promise<{
  imageBuffer: { buffer: Buffer; mediaType: string };
  model: ImageModel;
  modelConfig: (typeof IMAGE_MODELS)[ImageModel];
}> {
  let lastError: unknown;

  /* eslint-disable no-await-in-loop */
  for (const model of params.route) {
    const modelConfig = IMAGE_MODELS[model];
    const attemptStartedAt = Date.now();
    let customKeyProvider: CustomKeyProvider | undefined;
    const markCustomKeyUsed: CustomKeyUsageMarker = (provider) => {
      customKeyProvider = provider;
    };

    try {
      assertCustomApiKeyAvailable(model, params.customApiKeys);
      const imageBuffer = isOpenAiImageModel(model)
        ? await generateWithGPT(
            params.params,
            modelConfig.apiModelId,
            params.customApiKeys?.openaiApiKey,
            {
              customKeyProvider: "openai",
              onCustomKeyUsed: markCustomKeyUsed,
            },
          )
        : isApiyiGeminiImageModel(model)
          ? await generateWithApiyiGemini(
              params.params,
              modelConfig.apiModelId,
              params.customApiKeys?.apiyiApiKey,
              markCustomKeyUsed,
            )
          : isApiyiOpenAiImageModel(model)
            ? await generateWithApiyiOpenAi(
                params.params,
                modelConfig.apiModelId,
                params.customApiKeys?.apiyiApiKey,
                markCustomKeyUsed,
              )
            : await generateWithGemini(
                params.params,
                params.customApiKeys?.geminiApiKey,
                modelConfig.apiModelId,
                markCustomKeyUsed,
              );

      params.routingAttempts.push({
        model,
        provider: modelConfig.provider,
        api: getImageModelApi(model),
        apiModelId: modelConfig.apiModelId,
        status: "succeeded",
        durationMs: Date.now() - attemptStartedAt,
        ...(customKeyProvider ? { customKeyProvider } : {}),
      });

      return { imageBuffer, model, modelConfig };
    } catch (error) {
      lastError = error;
      params.routingAttempts.push({
        model,
        provider: modelConfig.provider,
        api: getImageModelApi(model),
        apiModelId: modelConfig.apiModelId,
        status: "failed",
        durationMs: Date.now() - attemptStartedAt,
        error: safeGenerationError(error),
        ...(customKeyProvider ? { customKeyProvider } : {}),
      });

      logger.warn(`[Generation] ${model} route attempt failed`, {
        api: getImageModelApi(model),
        apiModelId: modelConfig.apiModelId,
        error: safeGenerationError(error),
      });
    }
  }
  /* eslint-enable no-await-in-loop */

  throw lastError instanceof Error ? lastError : new Error("Generation failed");
}

function assertCustomApiKeyAvailable(
  model: ImageModel,
  customApiKeys?: CustomApiKeys,
) {
  if (!customApiKeys) return;
  if (isApiyiImageModel(model)) {
    if (!customApiKeys.apiyiApiKey) {
      throw new Error("APIYI API key is missing for this generation");
    }
    return;
  }
  if (isOpenAiImageModel(model)) {
    if (!customApiKeys.openaiApiKey) {
      throw new Error("OpenAI API key is missing for this generation");
    }
    return;
  }
  if (!customApiKeys.geminiApiKey) {
    throw new Error("Gemini API key is missing for this generation");
  }
}

async function generateWithGPT(
  params: GenerateImageParams,
  apiModelId: string,
  customApiKey?: string,
  options?: {
    baseURL?: string;
    apiKeyEnvName?: string;
    customKeyProvider?: CustomKeyProvider;
    onCustomKeyUsed?: CustomKeyUsageMarker;
  },
): Promise<{ buffer: Buffer; mediaType: string }> {
  const prompt = buildGPTPrompt(params);

  const allImageUrls = [
    ...(params.personImages ?? []),
    ...(params.inspirationImages ?? []),
    ...(params.userImages?.map((img) => img.imageUrl) ?? []),
    ...(params.baseImageUrl ? [params.baseImageUrl] : []),
  ];

  logger.info(
    `[${apiModelId}] Generating with ${allImageUrls.length} reference images${customApiKey ? " (custom API key)" : ""}`,
  );

  const apiKey =
    customApiKey ?? process.env[options?.apiKeyEnvName ?? "OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      options?.apiKeyEnvName === "APIYI_API_KEY"
        ? "APIYI API key is missing for GPT Image 2 (Efficient)"
        : "OpenAI API key is missing for GPT image generation",
    );
  }

  const openaiClient = new OpenAI({ apiKey, baseURL: options?.baseURL });
  if (customApiKey) {
    options?.onCustomKeyUsed?.(options.customKeyProvider ?? "openai");
  }

  const ratioConfig = ASPECT_RATIO_CONFIG[params.aspectRatio ?? "16:9"];
  const gptSize = ratioConfig.gptSize as unknown as "1024x1024";

  const result =
    allImageUrls.length === 0
      ? await withTimeout(
          `${apiModelId} image generation`,
          IMAGE_PROVIDER_TIMEOUT_MS,
          async (signal) =>
            openaiClient.images.generate(
              {
                model: apiModelId,
                prompt,
                size: gptSize,
                quality: "high",
              },
              { signal, timeout: IMAGE_PROVIDER_TIMEOUT_MS },
            ),
        )
      : await withTimeout(
          `${apiModelId} image generation`,
          IMAGE_PROVIDER_TIMEOUT_MS,
          async (signal) => {
            const imageFiles = await Promise.all(
              allImageUrls.map(async (url, index) => {
                const { buffer, mediaType } = await fetchSafeImageBuffer(url);
                return toFile(buffer, `reference-${index}.png`, {
                  type: mediaType,
                });
              }),
            );

            return openaiClient.images.edit(
              {
                model: apiModelId,
                image: imageFiles,
                prompt,
                size: gptSize,
                quality: "high",
              },
              { signal, timeout: IMAGE_PROVIDER_TIMEOUT_MS },
            );
          },
        );

  const imageData = result.data?.[0]?.b64_json;
  if (!imageData) {
    throw new Error(`No image generated by ${apiModelId}`);
  }

  return {
    buffer: Buffer.from(imageData, "base64"),
    mediaType: "image/png",
  };
}

async function generateWithGemini(
  params: GenerateImageParams,
  customApiKey?: string,
  modelId = "gemini-3-pro-image-preview",
  onCustomKeyUsed?: CustomKeyUsageMarker,
): Promise<{ buffer: Buffer; mediaType: string }> {
  const { content, textPrompt } = buildGeminiPrompt(params);

  const google = createGoogleGenerativeAI({
    apiKey: customApiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  let result;
  try {
    if (customApiKey) {
      onCustomKeyUsed?.("gemini");
    }
    result = await generateText({
      model: google(modelId),
      providerOptions: {
        google: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      },
      messages: [
        {
          role: "user",
          content: [...content, { type: "text", text: textPrompt }],
        },
      ],
    });

    // Extract response metadata for diagnostics.
    const rawBody = (result.response as { body?: unknown }).body as
      | {
          candidates?: {
            finishReason?: string;
            safetyRatings?: {
              category: string;
              probability: string;
              blocked?: boolean;
            }[];
          }[];
          promptFeedback?: {
            blockReason?: string;
          };
        }
      | undefined;

    const candidate = rawBody?.candidates?.[0];
    const finishReason = candidate?.finishReason ?? "unknown";
    const safetyRatings = candidate?.safetyRatings;
    const promptFeedback = rawBody?.promptFeedback;

    logger.info(`[Gemini] Response received`, {
      filesCount: result.files.length,
      fileTypes: result.files.map((f) => f.mediaType),
      textLength: result.text.length,
      finishReason,
      hasSafetyRatings: Boolean(safetyRatings?.length),
      promptBlocked: promptFeedback?.blockReason,
    });

    // Log warning for non-STOP finish reasons
    if (finishReason !== "STOP" && finishReason !== "unknown") {
      logger.warn(`[Gemini] Non-standard finishReason: ${finishReason}`, {
        safetyRatings: safetyRatings?.filter((r) => r.blocked),
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Try to extract blockReason from various places in the error.
    const errorRecord = error as {
      responseBody?: unknown;
      data?: unknown;
      cause?: { responseBody?: unknown; data?: unknown };
    };
    const errorData =
      errorRecord.responseBody ??
      errorRecord.data ??
      errorRecord.cause?.responseBody ??
      errorRecord.cause?.data;

    // Check multiple places for blockReason
    const errorDataString = errorData ? JSON.stringify(errorData) : "";
    const fullErrorString = `${errorMessage} ${errorDataString} ${String(error)}`;

    if (fullErrorString.includes("blockReason")) {
      const blockReasonMatch = fullErrorString.match(
        /"blockReason"\s*:\s*"(\w+)"/,
      );
      const blockReason = blockReasonMatch?.[1] ?? "UNKNOWN";

      logger.warn(`[Gemini] Content blocked: ${blockReason}`, {
        errorData,
        errorMessage,
      });

      if (blockReason === "SAFETY") {
        throw new Error(
          "[AI Policy] Google's AI blocked this request due to safety filters. This is not a bug - try rephrasing your prompt or using different reference images.",
        );
      } else if (blockReason === "OTHER") {
        throw new Error(
          "[AI Policy] Google's AI rejected this request. This often happens with certain face references or content. Try different images or simplify your prompt.",
        );
      } else {
        throw new Error(
          `[AI Policy] Google's AI blocked this request (${blockReason}). Try a different prompt or images.`,
        );
      }
    }

    // Also check for candidates validation error (no candidates in response means blocked)
    if (
      errorMessage.includes("Invalid JSON response") &&
      fullErrorString.includes("candidates")
    ) {
      logger.warn(`[Gemini] Response blocked (no candidates)`, {
        errorData,
        errorMessage,
      });
      throw new Error(
        "[AI Policy] Google's AI could not process this request. Try different reference images or a simpler prompt.",
      );
    }

    throw error;
  }

  const imageFile = result.files.find((file) =>
    file.mediaType.startsWith("image/"),
  );

  if (!imageFile) {
    // Log detailed diagnostics when no image is found.
    const rawBody = (result.response as { body?: unknown }).body as
      | {
          candidates?: {
            finishReason?: string;
            safetyRatings?: unknown;
          }[];
          promptFeedback?: unknown;
        }
      | undefined;
    const candidate = rawBody?.candidates?.[0];

    logger.error(`[Gemini] No image in response - detailed diagnostics`, {
      filesCount: result.files.length,
      allFileTypes: result.files.map((f) => f.mediaType),
      textPreview: result.text.substring(0, 500),
      finishReason: candidate?.finishReason ?? "unknown",
      safetyRatings: candidate?.safetyRatings,
      promptFeedback: rawBody?.promptFeedback,
      candidatesCount: rawBody?.candidates?.length ?? 0,
    });

    const finishReason = candidate?.finishReason;
    if (finishReason === "IMAGE_SAFETY" || finishReason === "SAFETY") {
      throw new Error(
        "[AI Policy] Google's AI blocked the generated image due to safety filters. Try a different prompt or reference images.",
      );
    }
    if (finishReason === "IMAGE_OTHER") {
      throw new Error(
        "[AI Policy] Google's AI failed to generate an image. This often happens with face references - try without person photos or use different images.",
      );
    }

    throw new Error(
      "[AI Error] Google's AI did not return an image. This is a temporary issue - please try again.",
    );
  }

  return {
    buffer: Buffer.from(imageFile.uint8Array),
    mediaType: imageFile.mediaType,
  };
}

const ApiyiGenerateContentResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              inlineData: z
                .object({
                  mimeType: z.string(),
                  data: z.string(),
                })
                .optional(),
            }),
          ),
        }),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z
    .object({
      blockReason: z.string().optional(),
    })
    .optional(),
});

async function generateWithApiyiGemini(
  params: GenerateImageParams,
  modelId: string,
  customApiKey?: string,
  onCustomKeyUsed?: CustomKeyUsageMarker,
): Promise<{ buffer: Buffer; mediaType: string }> {
  const apiKey = customApiKey ?? process.env.APIYI_API_KEY;
  if (!apiKey) {
    throw new Error("APIYI API key is missing for Nano Banana 2 (Efficient)");
  }

  const { content, textPrompt } = buildGeminiPrompt(params);
  const imageParts = await Promise.all(
    content
      .filter((part): part is Extract<ContentPart, { type: "image" }> => {
        return part.type === "image";
      })
      .map(async (part) => {
        const image = await fetchImageAsBase64(part.image);
        return {
          inlineData: {
            mimeType: image.mediaType,
            data: image.data,
          },
        };
      }),
  );

  logger.info(`[APIYI:${modelId}] Generating with ${imageParts.length} images`);
  if (customApiKey) {
    onCustomKeyUsed?.("apiyi");
  }

  const result = await withTimeout(
    `${modelId} image generation`,
    IMAGE_PROVIDER_TIMEOUT_MS,
    async (signal) =>
      upfetch(
        `https://api.apiyi.com/v1beta/models/${modelId}:generateContent`,
        {
          method: "POST",
          signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: {
            contents: [
              {
                parts: [{ text: textPrompt }, ...imageParts],
              },
            ],
            generationConfig: {
              responseModalities: ["IMAGE"],
              imageConfig: {
                aspectRatio: params.aspectRatio ?? "16:9",
                imageSize: "2K",
              },
              thinkingConfig: {
                thinkingLevel: "minimal",
                includeThoughts: false,
              },
            },
          },
          schema: ApiyiGenerateContentResponseSchema,
        },
      ),
  );

  const imagePart = result.candidates?.[0]?.content.parts.find(
    (part) => part.inlineData?.data,
  );
  const imageData = imagePart?.inlineData?.data;
  const mediaType = imagePart?.inlineData?.mimeType ?? "image/png";

  if (!imageData) {
    const finishReason = result.candidates?.[0]?.finishReason;
    const blockReason = result.promptFeedback?.blockReason;
    logger.error(`[APIYI:${modelId}] No image in response`, {
      finishReason,
      blockReason,
    });
    throw new Error(
      blockReason
        ? `[AI Policy] APIYI blocked this request (${blockReason}). Try a different prompt or images.`
        : "[AI Error] APIYI did not return an image. Please try again.",
    );
  }

  return {
    buffer: Buffer.from(imageData, "base64"),
    mediaType,
  };
}

async function generateWithApiyiOpenAi(
  params: GenerateImageParams,
  modelId: string,
  customApiKey?: string,
  onCustomKeyUsed?: CustomKeyUsageMarker,
): Promise<{ buffer: Buffer; mediaType: string }> {
  return generateWithGPT(params, modelId, customApiKey, {
    baseURL: "https://api.apiyi.com/v1",
    apiKeyEnvName: "APIYI_API_KEY",
    customKeyProvider: "apiyi",
    onCustomKeyUsed,
  });
}

async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: string }> {
  const { buffer, mediaType } = await fetchSafeImageBuffer(url);
  return {
    data: buffer.toString("base64"),
    mediaType,
  };
}

async function fetchSafeImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; mediaType: string }> {
  await assertSafeImageUrl(url);

  return upfetch(url, {
    redirect: "manual",
    parseResponse: async (response) => {
      if (response.status >= 300 && response.status < 400) {
        throw new Error("Reference image redirects are not allowed");
      }
      if (response.url && response.url !== url) {
        await assertSafeImageUrl(response.url);
      }
      const mediaType = response.headers.get("content-type") ?? "image/png";
      if (!mediaType.toLowerCase().startsWith("image/")) {
        throw new Error("Reference URL must return an image");
      }

      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > MAX_REFERENCE_IMAGE_BYTES) {
        throw new Error("Reference image is too large");
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_REFERENCE_IMAGE_BYTES) {
        throw new Error("Reference image is too large");
      }

      return {
        buffer: Buffer.from(arrayBuffer),
        mediaType,
      };
    },
  });
}

async function assertSafeImageUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Reference image URL is invalid");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Reference image URL must use HTTPS");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Reference image URL host is not allowed");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Reference image URL host is not allowed");
  }
}

function isPrivateAddress(address: string): boolean {
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function buildGPTPrompt(params: GenerateImageParams): string {
  const {
    prompt,
    personDescriptions = [],
    inspirationDescription,
    baseImageUrl,
    editPrompt,
    aspectRatio = "16:9",
  } = params;

  const ratioConfig = ASPECT_RATIO_CONFIG[aspectRatio];
  const isYouTube = aspectRatio === "16:9";
  const formatLabel = isYouTube ? "YouTube thumbnail" : "social media image";
  const [canvasWidth, canvasHeight] = ratioConfig.gptSize.split("x");

  const isEditMode = Boolean(baseImageUrl);

  let textPrompt = `Create a ${formatLabel} with extreme visual impact and high contrast.

Canvas and safe zone (MANDATORY):
- The canvas is ${canvasWidth}x${canvasHeight} pixels.
- Keep all important content (faces, key objects, any text) inside the ${ratioConfig.gptSafeZone}.
- The target display format is ${ratioConfig.promptText}, so content outside the safe zone may be cropped at display time.

Style requirements:
- Bold, punchy, attention-grabbing at small sizes
- Exaggerated expressions, dramatic poses, dynamic angles
- Saturated, vibrant color palette
- Clean focal point with simplified background
- Professional YouTuber quality (MrBeast, MKBHD level)
- NO stock photo look, NO generic AI aesthetic
- ALL people must be fully photorealistic — real human skin texture on face, hands, arms, fingers with visible fingernails, pores, and knuckles. NEVER output smooth, grey, or mannequin-style hands.`;

  if (personDescriptions.length > 0) {
    textPrompt += `\n\nPerson to include:\n${personDescriptions.join("\n")}`;
  }

  if (inspirationDescription && !isEditMode) {
    textPrompt += `\n\nStyle inspiration:\n${inspirationDescription}\nIMPORTANT: If the inspiration contains wireframe mannequins or grey placeholder figures, these are stand-ins for real people. NEVER reproduce them — replace with real people using the person descriptions above, or a natural-looking person if none provided. Replace ALL body parts including hands and arms — every visible body part must have real human skin texture with fingernails, pores, and natural skin tones.`;

    if (params.hasPlaceholderMannequin) {
      textPrompt += `\n\nCRITICAL - MANNEQUIN REPLACEMENT: The inspiration images CONTAIN dark grey wireframe mannequins (placeholder figures). You MUST replace ALL mannequins with real, photorealistic people. NEVER output any grey wireframe figure, featureless head, grid-textured body, OR smooth grey hands. Every body part — face, body, hands, fingers — must be fully human with natural skin texture, fingernails, and realistic proportions. This is NON-NEGOTIABLE.`;
    }

    if (params.hasAnonymizedLogoPlaceholders) {
      textPrompt += `\n\nCRITICAL - LOGO PLACEHOLDER REPLACEMENT: The inspiration images contain numbered logo placeholders such as logo 1, logo 2, or logo 3. The placeholder includes the visible number AND the square or rounded-square background tile behind it. When the user asks to replace a logo slot, replace the ENTIRE placeholder tile with the requested logo or referenced image. Do NOT keep the old square background, card, plaque, texture, or number. Never output the placeholder numbers near the logos. If the user asks for logo names above the logos, write only the names without numbers.`;
    }

    if (params.hasAnonymizedTextPlaceholders) {
      textPrompt += `\n\nCRITICAL - TEXT PLACEHOLDER REPLACEMENT: The inspiration images contain numbered lorem placeholders such as LOREM 1, IPSUM 2, or SIT AMET 3. These are editable text slots. Replace any slot mentioned by the user with the requested text. Never output lorem placeholder words or their numbers unless the user explicitly asks for those exact words. If a text slot is not specified, remove its placeholder words and numbers from the final image.`;
    }
  }

  if (isEditMode) {
    textPrompt += `\n\nEdit the existing image: ${editPrompt ?? prompt}`;
  } else {
    textPrompt += `\n\nThumbnail concept: ${prompt}`;
  }

  textPrompt += `\n\nConstraints:
- ${ratioConfig.promptText}
- Extreme contrast with stark value separation
- Highly saturated colors for maximum impact
- Minimal or no text overlay`;

  return textPrompt;
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string };

function buildGeminiPrompt(params: GenerateImageParams): {
  content: ContentPart[];
  textPrompt: string;
} {
  const {
    prompt,
    personDescriptions = [],
    personImages = [],
    inspirationDescription,
    inspirationImages = [],
    userImages = [],
    baseImageUrl,
    editPrompt,
    aspectRatio = "16:9",
  } = params;

  const ratioConfig = ASPECT_RATIO_CONFIG[aspectRatio];
  const isYouTube = aspectRatio === "16:9";
  const formatLabel = isYouTube ? "YouTube thumbnail" : "social media image";

  const content: ContentPart[] = [];
  let imageIndex = 1;

  const personImageRefs: string[] = [];
  for (const imageUrl of personImages) {
    content.push({ type: "image", image: imageUrl });
    personImageRefs.push(`IMAGE ${imageIndex}`);
    imageIndex++;
  }

  const inspirationImageRefs: string[] = [];
  const isEditMode = Boolean(baseImageUrl);
  if (!isEditMode) {
    for (const imageUrl of inspirationImages) {
      content.push({ type: "image", image: imageUrl });
      inspirationImageRefs.push(`IMAGE ${imageIndex}`);
      imageIndex++;
    }
  }

  const userImageRefs: {
    ref: string;
    name: string;
    description: string;
  }[] = [];
  for (const image of userImages) {
    content.push({ type: "image", image: image.imageUrl });
    userImageRefs.push({
      ref: `IMAGE ${imageIndex}`,
      name: image.name,
      description: image.description ?? "Uploaded image",
    });
    imageIndex++;
  }

  let baseImageRef: string | null = null;
  if (baseImageUrl) {
    content.push({ type: "image", image: baseImageUrl });
    baseImageRef = `IMAGE ${imageIndex}`;
    imageIndex++;
  }

  const hasPerson = personImageRefs.length > 0 || personDescriptions.length > 0;
  const hasInspiration =
    !isEditMode && (inspirationImageRefs.length > 0 || inspirationDescription);
  const hasUploaded = userImageRefs.length > 0;

  let textPrompt = `<role>You are an elite ${formatLabel} designer specializing in viral, high-CTR ${isYouTube ? "thumbnails" : "visuals"} with extreme visual impact.</role>

<critical_instruction>
YOU MUST GENERATE AN IMAGE. This is NON-NEGOTIABLE.
- Do NOT respond with text only
- Do NOT ask for clarification
- Do NOT explain what you would create
- ALWAYS output an actual image
If any input is unclear, make reasonable creative decisions and GENERATE THE IMAGE anyway.
</critical_instruction>

<objective>Generate a ${formatLabel} (${ratioConfig.width}x${ratioConfig.height}px) that maximizes click-through rate through HIGH CONTRAST and bold thumbnail-native styling.</objective>

<style_requirements priority="critical">
<contrast>
MANDATORY: Create EXTREME contrast in every element:
- Use stark light/dark value separation (pure whites against deep blacks)
- Apply dramatic color contrast (complementary colors, saturated vs desaturated)
- Ensure subject pops aggressively against background
- Add rim lighting, backlighting, or glow effects for separation
- NO muddy, flat, or low-contrast imagery
</contrast>
<thumbnail_style>
MANDATORY: Apply authentic YouTube thumbnail aesthetic:
- Bold, punchy, attention-grabbing at small sizes (must work as 160x90px preview)
- Exaggerated expressions, dramatic poses, dynamic angles
- Saturated, vibrant color palette (avoid muted or desaturated tones)
- Clean focal point with simplified background
- Professional YouTuber quality (MrBeast, MKBHD, Linus Tech Tips level)
- NO stock photo look, NO generic AI aesthetic, NO realistic photography style
</thumbnail_style>
<human_realism priority="critical">
MANDATORY: Every person in the output must look fully human and photorealistic:
- ALL skin (face, hands, arms, fingers) must have natural human skin texture with pores, wrinkles, and fingernails
- NEVER output smooth, grey, featureless, or plastic-looking hands or skin
- NEVER output mannequin-style body parts — no grid textures, no blank/smooth faces, no doll-like hands
- Hands must have visible knuckles, fingernails, natural skin tones, and realistic proportions
- If the inspiration contains any placeholder or mannequin elements, replace them entirely with photorealistic human equivalents
</human_realism>
</style_requirements>

<references>`;

  if (hasPerson) {
    const personDescriptionText =
      personDescriptions.length > 0
        ? personDescriptions.join("\n\n")
        : "No description provided";
    textPrompt += `
<persons priority="critical">
<images>${personImageRefs.length > 0 ? personImageRefs.join(", ") : "None"}</images>
<descriptions>${personDescriptionText}</descriptions>
<instructions>
MANDATORY: You MUST use ONLY these person's faces in the thumbnail.
- Reproduce their exact facial features, skin tones, expressions, and characteristics from the reference photos.
- These are the ONLY faces allowed in the output. Do NOT use any other faces.
- If there are faces in inspiration images, IGNORE them completely - only use the person references provided here.
</instructions>
</persons>`;
  }

  if (hasInspiration) {
    const mannequinInstructions = params.hasPlaceholderMannequin
      ? `
<mannequin_replacement priority="critical">
CRITICAL: The inspiration images CONTAIN dark grey 3D wireframe mannequins (featureless smooth heads, no face, grey body with grid texture). These are PLACEHOLDERS that MUST be replaced.
- NEVER reproduce any mannequin, wireframe figure, featureless head, grid-textured body, or smooth grey hands in the output. This is NON-NEGOTIABLE.
- Replace EVERY part of the mannequin: face, body, arms, AND hands. ALL body parts must become real human body parts with natural skin texture, fingernails, skin pores, and realistic lighting.
- When person references are provided, replace every mannequin with the referenced person in the same pose and position.
- When no person references are provided, replace every mannequin with a natural-looking, photorealistic person that fits the thumbnail style.
- The final image must contain ZERO mannequin remnants — no grey skin, no smooth featureless hands, no grid textures anywhere on any body part.
</mannequin_replacement>`
      : `- PLACEHOLDER MANNEQUINS: Inspiration images may contain dark grey 3D wireframe mannequins (featureless smooth heads, no face, grey body with grid texture). These are PLACEHOLDERS for real people.
  - NEVER reproduce mannequins/wireframe figures in the output — this includes faces, bodies, AND hands.
  - ALL body parts (hands, arms, fingers) must have real human skin texture with fingernails, pores, and natural skin tones. NEVER output smooth grey or featureless hands.
  - When person references are provided, replace mannequin positions with the referenced person in the same pose and position.
  - When no person references are provided, replace mannequins with a natural-looking person that fits the thumbnail style.`;
    const logoPlaceholderInstructions = params.hasAnonymizedLogoPlaceholders
      ? `
<logo_placeholder_replacement priority="critical">
CRITICAL: The inspiration images contain numbered anonymized logo placeholders.
- A logo placeholder is the full square or rounded-square tile, including its number, background shape, card, plaque, shadow, texture, and any label attached to that numbered slot.
- When the user says logo 1, logo 2, logo 3, or similar, replace that exact entire placeholder tile with the requested logo or referenced image.
- Do NOT keep the old grey/dark/colored square background behind the new logo unless the user explicitly asks for a background tile.
- Do NOT place the placeholder number above, beside, inside, or near the logo in the final image.
- If the user asks to write names above logos, write only the requested names, with no placeholder numbers.
- If no replacement is specified for a numbered logo placeholder, remove the number and avoid inventing a new brand logo. Use a clean unbranded mark or remove the slot if that best preserves the layout.
</logo_placeholder_replacement>`
      : "";
    const textPlaceholderInstructions = params.hasAnonymizedTextPlaceholders
      ? `
<text_placeholder_replacement priority="critical">
CRITICAL: The inspiration images contain numbered lorem text placeholders.
- LOREM 1, IPSUM 2, DOLOR 3, SIT AMET 4, and similar text are editable placeholders, not final copy.
- When the user targets a numbered lorem/text slot, replace that exact text block with the requested final text.
- Never output lorem placeholder words or their numbers unless the user explicitly asks for those exact words.
- If a placeholder text block is not specified by the user, remove its placeholder words and marker numbers from the final image.
</text_placeholder_replacement>`
      : "";

    textPrompt += `
<inspiration priority="high">
<images>${inspirationImageRefs.length > 0 ? inspirationImageRefs.join(", ") : "None"}</images>
<style>${inspirationDescription ?? "No style description"}</style>
<instructions>
STYLE ONLY - NO FACES: Use this inspiration for STYLE reference only.
- Match the composition, color grading, lighting, mood, text placement, and overall aesthetic.
- NEVER copy or use any faces from the inspiration images.
- If person references are provided above, use ONLY those faces - not the faces from inspiration.
- The output must feel like it belongs to the same YouTube channel style-wise, but with the correct person's face.
${mannequinInstructions}
${logoPlaceholderInstructions}
${textPlaceholderInstructions}
- PIXELATED REGIONS: If any areas in the inspiration images appear pixelated or blurred, these are intentionally hidden elements.
  - When a pixelated face region exists AND person references are provided, replace the pixelated area with the referenced person's face.
  - Always remove pixelation in the output - generate clean, unpixelated content in those regions.
  - Never reproduce the pixelation effect in the generated thumbnail.
</instructions>
</inspiration>`;
  }

  if (hasUploaded) {
    const imageList = userImageRefs
      .map((img) => `- "${img.name}" (${img.ref}): ${img.description}`)
      .join("\n");
    textPrompt += `
<additional_references>
<images>
${imageList}
</images>
<instructions>
When the user mentions an image by name (e.g., "React Logo", "Website"), they refer to the corresponding image listed above.
Example: If user says "put the React Logo in the corner", use the image named "React Logo".
Incorporate these elements or use as additional visual context based on user instructions.
</instructions>
</additional_references>`;
  }

  if (baseImageRef) {
    textPrompt += `
<base_image priority="critical">
<image>${baseImageRef}</image>
<edit_instructions>${editPrompt ?? "Improve and enhance this image"}</edit_instructions>
<instructions>CRITICAL: This is the base image to edit. You must preserve the overall composition, main subject, and key elements of this image while applying the requested edits. The output should be a modified version of this specific image, not a completely new generation.</instructions>
</base_image>`;
  }

  textPrompt += `
</references>

<request>${baseImageRef ? `Edit the base image: ${editPrompt ?? prompt}` : prompt}</request>

<constraints>
<format>${ratioConfig.promptText}</format>
<contrast priority="critical">EXTREME contrast is NON-NEGOTIABLE - stark value separation, dramatic lighting, subject must POP</contrast>
<style priority="critical">YouTube thumbnail aesthetic ONLY - bold, punchy, NOT realistic photography</style>
<composition>Clear focal point, simplified background, strong visual hierarchy</composition>
<colors>Highly saturated, vibrant, maximum visual impact at thumbnail size</colors>
<expressions>Exaggerated, emotional, attention-grabbing facial expressions</expressions>
<text>Minimal or none - thumbnails perform best without text overlay</text>
<quality>Professional YouTuber quality (MrBeast/MKBHD level), immediately uploadable</quality>
</constraints>

<final_reminder>
REMEMBER: Your response MUST include a generated image. Do not respond with text only. Generate the thumbnail image NOW.
</final_reminder>`;

  return { content, textPrompt };
}
