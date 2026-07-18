"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  fileToUploadedImage,
  validateImageFiles,
} from "@/features/thumbnail-generator/image-files";
import {
  type GenerateErrorResponse,
  type GenerateSuccessResponse,
  type GeneratedImagePayload,
  type GenerationState,
  type ThumbnailCount,
  type UploadGroup,
  type UploadsByGroup,
} from "@/features/thumbnail-generator/types";

const EMPTY_UPLOADS: UploadsByGroup = {
  extra: [],
  inspiration: [],
  persons: [],
};

const UPLOAD_LIMITS: Record<UploadGroup, number> = {
  extra: 6,
  inspiration: 1,
  persons: 5,
};

export function useThumbnailGenerator() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState<ThumbnailCount>(1);
  const [uploads, setUploads] = useState<UploadsByGroup>(EMPTY_UPLOADS);
  const uploadsRef = useRef<UploadsByGroup>(EMPTY_UPLOADS);
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [generation, setGeneration] = useState<GenerationState>({
    status: "idle",
    images: [],
  });

  const isGenerating = generation.status === "loading";

  function addFiles(group: UploadGroup, files: File[]) {
    const task = uploadQueueRef.current.then(() => prepareAndAddFiles(group, files));
    uploadQueueRef.current = task.catch(() => undefined);
    return task;
  }

  async function prepareAndAddFiles(group: UploadGroup, files: File[]) {
    const shouldReplace = group === "inspiration";
    const currentUploads = uploadsRef.current;
    const groupImages = currentUploads[group];
    const retainedUploadsSize = getUploadsSize(currentUploads) -
      (shouldReplace ? getImagesSize(groupImages) : 0);
    const availableSlots = shouldReplace
      ? 1
      : UPLOAD_LIMITS[group] - groupImages.length;
    const { acceptedFiles, rejectionMessages } = validateImageFiles(
      files,
      retainedUploadsSize,
      availableSlots,
    );

    showFileRejections(rejectionMessages);
    if (acceptedFiles.length === 0) return;

    try {
      const nextImages = await Promise.all(acceptedFiles.map(fileToUploadedImage));
      const latestUploads = uploadsRef.current;
      const nextUploads: UploadsByGroup = {
        ...latestUploads,
        [group]: shouldReplace
          ? nextImages.slice(0, 1)
          : [...latestUploads[group], ...nextImages].slice(0, UPLOAD_LIMITS[group]),
      };

      uploadsRef.current = nextUploads;
      setUploads(nextUploads);
    } catch (error) {
      toast.error(getErrorMessage(error, "An image could not be prepared."));
    }
  }

  function removeImage(group: UploadGroup, imageId: string) {
    const currentUploads = uploadsRef.current;
    const nextUploads: UploadsByGroup = {
      ...currentUploads,
      [group]: currentUploads[group].filter((image) => image.id !== imageId),
    };

    uploadsRef.current = nextUploads;
    setUploads(nextUploads);
  }

  async function generateThumbnails() {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast.error("Enter a prompt before generating thumbnails.");
      return;
    }

    const previousImages = generation.images;
    const currentUploads = uploadsRef.current;
    setGeneration({ status: "loading", images: previousImages, pendingCount: count });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildPrompt(trimmedPrompt, currentUploads),
          images: flattenUploads(currentUploads).map((image) => image.dataUrl),
          count,
        }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getApiError(body));
      }

      if (!isGenerateSuccessResponse(body) || body.images.length === 0) {
        throw new Error("The model returned no usable thumbnails.");
      }

      const nextImages = body.images.map((image) => ({
        ...image,
        id: crypto.randomUUID(),
      }));

      setGeneration({ status: "success", images: nextImages });
      if (body.warning) toast.warning(body.warning);
    } catch (error) {
      const message = getErrorMessage(error, "Thumbnail generation failed.");
      setGeneration({ status: "error", images: previousImages, message });
      toast.error(message);
    }
  }

  return {
    addFiles,
    count,
    generateThumbnails,
    generation,
    isGenerating,
    prompt,
    removeImage,
    setCount,
    setPrompt,
    uploads,
  };
}

function flattenUploads(uploads: UploadsByGroup) {
  return [...uploads.extra, ...uploads.inspiration, ...uploads.persons];
}

function buildPrompt(prompt: string, uploads: UploadsByGroup) {
  const notes: string[] = [];

  if (uploads.extra.length > 0) {
    notes.push(`The first ${uploads.extra.length} reference image(s) are supporting visual material.`);
  }
  if (uploads.inspiration.length > 0) {
    notes.push("The next reference image is composition and style inspiration.");
  }
  if (uploads.persons.length > 0) {
    notes.push(`The final ${uploads.persons.length} reference image(s) show people who should remain recognizable.`);
  }

  return notes.length === 0 ? prompt : `${prompt}\n\nReference guide:\n${notes.join("\n")}`;
}

function getUploadsSize(uploads: UploadsByGroup) {
  return getImagesSize(flattenUploads(uploads));
}

function getImagesSize(images: { size: number }[]) {
  return images.reduce((total, image) => total + image.size, 0);
}

function showFileRejections(messages: string[]) {
  if (messages.length === 0) return;

  const remainingCount = messages.length - 1;
  const description = remainingCount > 0
    ? `${messages[0]} ${remainingCount} more file${remainingCount === 1 ? " was" : "s were"} skipped.`
    : messages[0];

  toast.error(description);
}

function isGenerateSuccessResponse(value: unknown): value is GenerateSuccessResponse {
  if (!value || typeof value !== "object" || !("images" in value)) return false;

  const images = (value as { images: unknown }).images;
  return Array.isArray(images) && images.every(isGeneratedImagePayload);
}

function isGeneratedImagePayload(value: unknown): value is GeneratedImagePayload {
  if (!value || typeof value !== "object") return false;

  const image = value as Partial<GeneratedImagePayload>;
  return typeof image.data === "string" && typeof image.mediaType === "string";
}

function getApiError(value: unknown) {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as GenerateErrorResponse).error;
    if (typeof error === "string" && error.length > 0) return error;
  }

  return "The generation request could not be completed.";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
