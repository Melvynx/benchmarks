import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import {
  APICallError,
  generateText,
  LoadAPIKeyError,
  RetryError,
  type ImagePart,
} from "ai";
import sharp from "sharp";

import type { GeneratedImagePayload } from "@/features/thumbnail-generator/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "gemini-3-pro-image-preview" as const;
const REQUIRED_PROMPT_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors";
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 6000;
const MAX_REFERENCE_IMAGES = 12;
const MAX_REFERENCE_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_REFERENCE_BYTES = 7 * 1024 * 1024;
const GENERATION_TIMEOUT_MS = 240_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 6;
const MAX_CONCURRENT_REQUESTS = 2;
const MAX_CONCURRENT_MODEL_CALLS = 4;
const MAX_RATE_LIMIT_ENTRIES = 1000;

const requestWindows = new Map<string, { count: number; startedAt: number }>();
let activeRequests = 0;
let activeModelCalls = 0;

interface ModelCallWaiter {
  abortHandler: () => void;
  reject: (reason?: unknown) => void;
  resolve: () => void;
  signal: AbortSignal;
}

const modelCallQueue: ModelCallWaiter[] = [];

class NoImageResponseError extends Error {
  constructor() {
    super("The model returned no image.");
    this.name = "NoImageResponseError";
  }
}

class InvalidJsonError extends Error {}
class PayloadTooLargeError extends Error {}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const validation = await validateRequestBody(body);

    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "Image generation is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY." },
        { status: 500 },
      );
    }

    const retryAfter = consumeRateLimit(request);
    if (retryAfter !== null) {
      return Response.json(
        { error: "Too many generation requests. Wait a moment, then try again." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
      return Response.json(
        { error: "The generator is at capacity. Try again in a moment." },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }

    const { prompt, images, count } = validation;
    const timeoutSignal = AbortSignal.timeout(GENERATION_TIMEOUT_MS);
    const abortSignal = AbortSignal.any([request.signal, timeoutSignal]);
    activeRequests += 1;

    let attempts: PromiseSettledResult<GeneratedImagePayload>[];
    try {
      attempts = await Promise.allSettled(
        Array.from({ length: count }, () => generateOne(prompt, images, abortSignal)),
      );
    } finally {
      activeRequests -= 1;
    }
    const generatedImages = attempts.flatMap((attempt) =>
      attempt.status === "fulfilled" ? [attempt.value] : [],
    );

    if (generatedImages.length === 0) {
      const firstFailure = attempts.find(
        (attempt): attempt is PromiseRejectedResult => attempt.status === "rejected",
      );
      throw firstFailure?.reason ?? new NoImageResponseError();
    }

    const failedCount = count - generatedImages.length;
    const warning = failedCount > 0
      ? `${generatedImages.length} of ${count} thumbnails were generated. Try again for more options.`
      : undefined;

    return Response.json({ images: generatedImages, warning });
  } catch (error) {
    return createErrorResponse(error);
  }
}

async function generateOne(
  prompt: string,
  images: string[],
  abortSignal: AbortSignal,
): Promise<GeneratedImagePayload> {
  await acquireModelCallSlot(abortSignal);

  try {
    const imageParts: ImagePart[] = images.map((image) => ({
      type: "image",
      image,
    }));
    const result = await generateText({
      model: google(MODEL),
      abortSignal,
      maxRetries: 1,
      providerOptions: {
        google: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K",
          },
        } satisfies GoogleLanguageModelOptions,
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${prompt}\n\n${REQUIRED_PROMPT_SUFFIX}`,
            },
            ...imageParts,
          ],
        },
      ],
    });
    const generatedImage = result.files.find((file) =>
      file.mediaType.startsWith("image/"),
    );

    if (!generatedImage) throw new NoImageResponseError();

    return {
      data: generatedImage.base64,
      mediaType: generatedImage.mediaType,
    };
  } finally {
    releaseModelCallSlot();
  }
}

type ValidatedRequest =
  | { ok: false; error: string }
  | { ok: true; prompt: string; images: string[]; count: 1 | 2 | 3 | 4 };

async function validateRequestBody(body: unknown): Promise<ValidatedRequest> {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return { ok: false, error: "Prompt is required." };
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: "Prompt is too long." };
  }

  if (!Array.isArray(body.images)) {
    return { ok: false, error: "Images must be provided as an array." };
  }
  if (body.images.length > MAX_REFERENCE_IMAGES) {
    return { ok: false, error: `Use no more than ${MAX_REFERENCE_IMAGES} reference images.` };
  }

  const images: string[] = [];
  let totalImageBytes = 0;

  for (const image of body.images) {
    if (typeof image !== "string") {
      return { ok: false, error: "Every reference must be an encoded JPEG, PNG, or WebP image." };
    }

    const inspectedImage = inspectImageDataUrl(image);
    if (!inspectedImage) {
      return { ok: false, error: "Every reference must be a valid JPEG, PNG, or WebP image." };
    }
    if (inspectedImage.byteLength > MAX_REFERENCE_IMAGE_BYTES) {
      return { ok: false, error: "Each reference image must be 4 MB or smaller." };
    }

    const nextTotalImageBytes = totalImageBytes + inspectedImage.byteLength;
    if (nextTotalImageBytes > MAX_TOTAL_REFERENCE_BYTES) {
      return { ok: false, error: "Reference images must be 7 MB or smaller in total." };
    }
    if (!(await canDecodeImage(inspectedImage.mediaType, inspectedImage.bytes))) {
      return { ok: false, error: "Every reference must be a valid JPEG, PNG, or WebP image." };
    }

    totalImageBytes = nextTotalImageBytes;
    images.push(image);
  }

  if (!isThumbnailCount(body.count)) {
    return { ok: false, error: "Count must be an integer from 1 to 4." };
  }

  return { ok: true, prompt, images, count: body.count };
}

function inspectImageDataUrl(image: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match) return undefined;

  const [, mediaType, payload] = match;
  if (payload.length % 4 !== 0) return undefined;

  const bytes = Buffer.from(payload, "base64");
  const canonicalPayload = bytes.toString("base64").replace(/=+$/, "");
  if (bytes.length === 0 || canonicalPayload !== payload.replace(/=+$/, "")) return undefined;
  return { byteLength: bytes.byteLength, bytes, mediaType };
}

async function canDecodeImage(mediaType: string, bytes: Buffer) {
  const expectedFormat = mediaType === "image/jpeg" ? "jpeg" : mediaType.slice("image/".length);

  try {
    const image = sharp(bytes, {
      failOn: "error",
      limitInputPixels: 64_000_000,
    });
    const metadata = await image.metadata();
    if (
      metadata.format !== expectedFormat ||
      !metadata.width ||
      !metadata.height
    ) {
      return false;
    }

    await sharp(bytes, {
      failOn: "error",
      limitInputPixels: 64_000_000,
    }).resize(1, 1).raw().toBuffer();
    return true;
  } catch {
    return false;
  }
}

function isThumbnailCount(value: unknown): value is 1 | 2 | 3 | 4 {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4;
}

function acquireModelCallSlot(signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  if (activeModelCalls < MAX_CONCURRENT_MODEL_CALLS) {
    activeModelCalls += 1;
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const waiter: ModelCallWaiter = {
      abortHandler: () => {
        const index = modelCallQueue.indexOf(waiter);
        if (index >= 0) modelCallQueue.splice(index, 1);
        reject(signal.reason);
      },
      reject,
      resolve,
      signal,
    };

    modelCallQueue.push(waiter);
    signal.addEventListener("abort", waiter.abortHandler, { once: true });
    if (signal.aborted) waiter.abortHandler();
  });
}

function releaseModelCallSlot() {
  while (modelCallQueue.length > 0) {
    const waiter = modelCallQueue.shift();
    if (!waiter) break;

    waiter.signal.removeEventListener("abort", waiter.abortHandler);
    if (waiter.signal.aborted) {
      waiter.reject(waiter.signal.reason);
      continue;
    }

    waiter.resolve();
    return;
  }

  activeModelCalls -= 1;
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }

  if (!request.body) throw new InvalidJsonError();

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let json = "";
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    json += decoder.decode(value, { stream: true });
  }
  json += decoder.decode();

  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new InvalidJsonError();
  }
}

function consumeRateLimit(request: Request) {
  const now = Date.now();
  const clientId = getClientId(request);
  const currentWindow = requestWindows.get(clientId);

  if (currentWindow && now - currentWindow.startedAt < RATE_LIMIT_WINDOW_MS) {
    if (currentWindow.count >= MAX_REQUESTS_PER_WINDOW) {
      return Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - currentWindow.startedAt)) / 1000));
    }

    currentWindow.count += 1;
    return null;
  }

  if (currentWindow) requestWindows.delete(clientId);
  makeRoomForRateLimitEntry(now);
  requestWindows.set(clientId, { count: 1, startedAt: now });
  return null;
}

function makeRoomForRateLimitEntry(now: number) {
  for (const [clientId, window] of requestWindows) {
    if (now - window.startedAt >= RATE_LIMIT_WINDOW_MS) requestWindows.delete(clientId);
  }

  while (requestWindows.size >= MAX_RATE_LIMIT_ENTRIES) {
    const oldestClientId = requestWindows.keys().next().value as string | undefined;
    if (!oldestClientId) break;
    requestWindows.delete(oldestClientId);
  }
}

function getClientId(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwardedFor || request.headers.get("x-real-ip") || "anonymous").slice(0, 128);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createErrorResponse(error: unknown) {
  if (error instanceof PayloadTooLargeError) {
    return Response.json(
      { error: "The selected images exceed the 10 MB request limit." },
      { status: 413 },
    );
  }
  if (error instanceof InvalidJsonError) {
    return Response.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }
  if (isErrorNamed(error, "TimeoutError")) {
    return Response.json(
      { error: "Image generation timed out. Try again with fewer references." },
      { status: 504 },
    );
  }
  if (isErrorNamed(error, "AbortError")) {
    return Response.json({ error: "Image generation was cancelled." }, { status: 408 });
  }

  if (LoadAPIKeyError.isInstance(error)) {
    return Response.json(
      { error: "Image generation is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY." },
      { status: 500 },
    );
  }

  const apiError = unwrapApiCallError(error);
  if (apiError?.statusCode === 429) {
    return Response.json(
      { error: "The image service is busy. Wait a moment, then try again." },
      { status: 429 },
    );
  }
  if (apiError) {
    return Response.json(
      { error: "The image service could not complete this request." },
      { status: 502 },
    );
  }
  if (error instanceof NoImageResponseError) {
    return Response.json(
      { error: "The model returned no usable thumbnail. Adjust the prompt and try again." },
      { status: 502 },
    );
  }

  return Response.json(
    { error: "Thumbnail generation failed. Try again." },
    { status: 500 },
  );
}

function isErrorNamed(error: unknown, name: string) {
  return error instanceof Error && error.name === name;
}

function unwrapApiCallError(error: unknown) {
  if (APICallError.isInstance(error)) return error;

  if (RetryError.isInstance(error) && APICallError.isInstance(error.lastError)) {
    return error.lastError;
  }

  return undefined;
}
