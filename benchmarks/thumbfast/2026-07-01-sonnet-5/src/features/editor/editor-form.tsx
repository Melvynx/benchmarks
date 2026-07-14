import { Loader } from "@/components/nowts/loader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import {
  IMAGE_MODELS,
  getPublicImageModels,
  getPublicModelId,
  resolveModelId,
  type ImageModel,
} from "@/lib/ai/image-models";
import { makeFunctionReference } from "convex/server";
import { canGenerate } from "@/features/credits/can-generate";
import { type AspectRatio } from "@/lib/ai/aspect-ratio";
import { CreditBalance } from "@/features/credits/credit-balance";
import { useCredits } from "@/features/credits/credits.query";
import { InspirationMultiSelector } from "@/features/inspiration/inspiration-multi-selector";
import { useInspirations } from "@/features/inspiration/inspiration.query";
import { PersonMultiSelector } from "@/features/person/person-multi-selector";
import { openReferralDialog } from "@/features/referral/open-referral-dialog";
import { usePersons } from "@/features/person/person.query";
import { UserImageGallery } from "@/features/user-image/user-image-gallery";
import {
  updateUserImageName as renameUploadedUserImage,
  uploadUserImage,
} from "@/features/user-image/user-image-upload";
import { useUserImages } from "@/features/user-image/user-image.query";
import { cn } from "@/lib/utils";
import { useMutation } from "@/hooks/use-async-mutation";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
} from "convex/react";
import {
  Banana,
  Droplets,
  ImageIcon,
  LinkIcon,
  RectangleHorizontal,
  RectangleVertical,
  Sparkles,
  Square,
  Star,
  User,
  X,
} from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { useRouter } from "@/compat/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNoWatermark } from "./use-no-watermark";
import { openGlobalDialog } from "@/features/global-dialog/global-dialog.store";
import { createInspirationRef } from "@/features/inspiration/inspiration.convex";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { SocialMediaSetDialog } from "@/features/social-media-set/social-media-set-dialog";

const RAPID_GENERATE_THRESHOLD_MS = 10_000;

function removeAutoGenerateSearchParam() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has("autoGenerate")) return;

  url.searchParams.delete("autoGenerate");
  window.history.replaceState({}, "", url.toString());
}

function getAutoGenerateSearchParam() {
  if (typeof window === "undefined") return null;

  return new URL(window.location.href).searchParams.get("autoGenerate");
}

const createThumbnailGenerationRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    promptId?: string;
    prompt: string;
    model: string;
    aspectRatio: string;
    count?: number;
    personIds?: string[];
    inspirationIds?: string[];
    userImageIds?: string[];
    baseImageUrl?: string;
    baseThumbnailId?: string;
    editPrompt?: string;
  },
  {
    promptId: string;
    generationId: string;
    thumbnailId: string;
    thumbnailIds: string[];
  }
>("editor:createThumbnailGeneration");
const cancelGenerationRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; generationId: string },
  { id: string }
>("editor:cancelGeneration");
const enhancePromptRef = makeFunctionReference<
  "action",
  { textPrompt: string },
  { enhanced: string }
>("editor:enhancePrompt");
const generateUserImageUploadUrlRef = makeFunctionReference<
  "mutation",
  { orgSlug: string },
  string
>("userImages:generateAnalyzedUploadUrl");
const createUserImageFromUploadRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    storageId: string;
    name?: string;
    contentType?: string;
  },
  { id: string; imageUrl: string; name: string; description: string | null }
>("userImagesNode:createFromUpload");
const renameUserImageRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; id: string; name: string },
  { id: string; name: string }
>("userImages:rename");
import {
  VideoSelectorDialog,
  useAddToVideo,
} from "@/features/video/video-selector-dialog";
import type {
  GenerationWithThumbnails,
  PromptWithRelations,
} from "./editor.query";
import { usePrompt } from "./editor.query";
import { useEditorStore } from "./editor.store";
import { GenerationGallery } from "./generation-gallery";
import { showImageLimitDialog } from "./show-image-limit-dialog";
import {
  UploadedImagesList,
  UploadedImagesAddButton,
} from "./uploaded-images-list";
import { PromptEditor, setOrgSlug } from "./prompt-editor";

type EditorFormProps = {
  orgSlug: string;
  initialPrompt?: PromptWithRelations;
  initialInspirationId?: string;
  initialPersonIds?: string[];
  initialEditImage?: string;
  initialEditThumbnailId?: string;
  maxGenerations?: number;
  autoGenerate?: boolean;
};

export function EditorForm({
  orgSlug,
  initialPrompt,
  initialInspirationId,
  initialPersonIds,
  initialEditImage,
  initialEditThumbnailId,
  maxGenerations: maxGenerationsProp,
  autoGenerate,
}: EditorFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialPrompt);
  const { data: creditsData } = useCredits(orgSlug);
  const createThumbnailGeneration = useConvexMutation(
    createThumbnailGenerationRef,
  );
  const cancelGeneration = useConvexMutation(cancelGenerationRef);
  const enhancePrompt = useConvexAction(enhancePromptRef);
  const createInspiration = useConvexAction(createInspirationRef);
  const maxGenerations = maxGenerationsProp ?? creditsData?.maxGenerations ?? 2;
  const noWatermark = useNoWatermark();
  const showRemoveWatermarkCta = !noWatermark;
  const [isUploading, setIsUploading] = useState(false);

  const { data: persons } = usePersons(orgSlug);
  const { data: inspirationsData } = useInspirations(orgSlug);
  const inspirations = inspirationsData?.items;
  const { data: galleryUserImages } = useUserImages(orgSlug);
  const generateUserImageUploadUrl = useConvexMutation(
    generateUserImageUploadUrlRef,
  );
  const createUserImageFromUpload = useConvexAction(
    createUserImageFromUploadRef,
  );
  const renameUserImage = useConvexMutation(renameUserImageRef);
  const [branchingThumbnailId, setBranchingThumbnailId] = useState<
    string | null
  >(null);
  const [socialMediaSetData, setSocialMediaSetData] = useState<{
    imageUrl: string;
    generation: GenerationWithThumbnails;
  } | null>(null);

  const {
    dialogState: videoDialogState,
    openDialog: openVideoDialog,
    closeDialog: closeVideoDialog,
    handleSuccess: handleVideoSuccess,
  } = useAddToVideo(orgSlug);

  const {
    textPrompt,
    personIds,
    inspirationIds,
    userImages,
    editingImage,
    editingThumbnailId,
    thumbnailCount,
    model,
    aspectRatio,
    originalPrompt,
    setTextPrompt,
    setOriginalPrompt,
    setThumbnailCount,
    setModel,
    setAspectRatio,
    setEditingImage,
    setEditingThumbnailId,
    setPersonIds,
    setInspirationIds,
    setUserImages,
    setPersons,
    setInspirations,
    setAvailableUserImages,
    addUserImage,
    removeUserImage,
    updateUserImageName,
    canAddImages,
    getRemainingImageSlots,
    getUserImageIds,
    initialize,
    reset,
  } = useEditorStore();
  const resolvedModel = resolveModelId(model);
  const publicModel = getPublicModelId(resolvedModel);

  useEffect(() => {
    if (thumbnailCount > maxGenerations) {
      setThumbnailCount(Math.max(1, maxGenerations));
    }
  }, [maxGenerations, setThumbnailCount, thumbnailCount]);

  useEffect(() => {
    if (model !== publicModel) {
      setModel(publicModel);
    }
  }, [model, publicModel, setModel]);

  useEffect(() => {
    initialize({
      textPrompt: initialPrompt?.textPrompt,
      personIds: initialPrompt?.personIds ?? initialPersonIds,
      inspirationIds:
        initialPrompt?.inspirationIds ??
        (initialInspirationId ? [initialInspirationId] : undefined),
      userImages: initialPrompt?.userImages,
      editingImage: initialEditImage,
      editingThumbnailId: initialEditThumbnailId,
    });

    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (persons) {
      setPersons(persons);
    }
  }, [persons, setPersons]);

  useEffect(() => {
    if (inspirations) {
      setInspirations(inspirations);
    }
  }, [inspirations, setInspirations]);

  useEffect(() => {
    if (galleryUserImages) {
      setAvailableUserImages(galleryUserImages);
    }
  }, [galleryUserImages, setAvailableUserImages]);

  const { data: promptData, isFetched: isPromptFetched } = usePrompt(
    orgSlug,
    initialPrompt?.id ?? "",
    {
      initialData: initialPrompt,
      enabled: Boolean(initialPrompt?.id),
    },
  );

  const prompt = promptData ?? initialPrompt;

  useEffect(() => {
    const autoGenerateParam = getAutoGenerateSearchParam();
    if (!autoGenerateParam) return;
    if (autoGenerateParam === "true" && isEditing) return;

    removeAutoGenerateSearchParam();
  }, [isEditing]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return createThumbnailGeneration({
        orgSlug,
        prompt: textPrompt,
        personIds,
        inspirationIds,
        userImageIds: getUserImageIds(),
        count: thumbnailCount,
        model: publicModel,
        aspectRatio,
      });
    },
    onSuccess: async (data) => {
      router.push(`/orgs/${orgSlug}/thumbnails/${data.promptId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!prompt) throw new Error("No prompt");
      return createThumbnailGeneration({
        orgSlug,
        promptId: prompt.id,
        count: thumbnailCount,
        prompt: textPrompt,
        personIds,
        inspirationIds,
        userImageIds: getUserImageIds(),
        baseImageUrl: editingImage ?? undefined,
        baseThumbnailId: editingThumbnailId ?? undefined,
        editPrompt: editingImage ? textPrompt : undefined,
        model: publicModel,
        aspectRatio,
      });
    },
    onSuccess: async () => {
      setOriginalPrompt(textPrompt);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [isEnhancing, setIsEnhancing] = useState(false);
  const hasAutoGeneratedRef = useRef(false);
  const lastGenerateAtRef = useRef<number>(0);
  const isConfirmOpenRef = useRef(false);

  const runWithRapidGuard = useCallback((run: () => void) => {
    if (isConfirmOpenRef.current) {
      return;
    }

    const now = Date.now();
    const elapsed = now - lastGenerateAtRef.current;

    if (
      lastGenerateAtRef.current > 0 &&
      elapsed < RAPID_GENERATE_THRESHOLD_MS
    ) {
      isConfirmOpenRef.current = true;
      dialogManager.confirm({
        title: "You just generated",
        description: "Do you want to generate more?",
        action: {
          label: "Continue",
          onClick: () => {
            isConfirmOpenRef.current = false;
            lastGenerateAtRef.current = Date.now();
            run();
          },
        },
        cancel: {
          label: "Cancel",
          onClick: () => {
            isConfirmOpenRef.current = false;
          },
        },
      });
      return;
    }

    lastGenerateAtRef.current = now;
    run();
  }, []);

  useEffect(() => {
    if (!autoGenerate || !isEditing || !isPromptFetched || !prompt) {
      return;
    }

    removeAutoGenerateSearchParam();

    const hasExistingGenerations = prompt.generations.length > 0;
    if (hasAutoGeneratedRef.current || hasExistingGenerations) {
      return;
    }

    hasAutoGeneratedRef.current = true;
    lastGenerateAtRef.current = Date.now();
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, isEditing, isPromptFetched, prompt]);

  const handleEnhance = async () => {
    setIsEnhancing(true);
    try {
      const result = await enhancePrompt({ textPrompt });
      setTextPrompt(result.enhanced);
      toast.success("Prompt enhanced");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enhancement failed",
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  useEffect(() => {
    setOrgSlug(orgSlug);
  }, [orgSlug]);

  const handleUpload = async (file: File): Promise<string> => {
    const { id, imageUrl, name, description } = await uploadUserImage(
      { orgSlug, file },
      {
        generateUploadUrl: async () => generateUserImageUploadUrl({ orgSlug }),
        createFromUpload: createUserImageFromUpload,
      },
    );

    addUserImage({
      id,
      imageUrl,
      name,
      description: description ?? "Uploaded image",
    });

    return imageUrl;
  };

  const handleMultipleFilesSelected = async (files: File[]) => {
    if (!canAddImages(files.length)) {
      showImageLimitDialog();
      return;
    }

    setIsUploading(true);
    try {
      await Promise.all(files.map(async (file) => handleUpload(file)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditImage = (imageUrl: string, thumbnailId?: string) => {
    setEditingImage(imageUrl);
    setEditingThumbnailId(thumbnailId ?? null);
    setOriginalPrompt(textPrompt);
  };

  const handleCancelEdit = () => {
    setEditingImage(null);
    setEditingThumbnailId(null);
    setTextPrompt(originalPrompt);
  };

  const handleEditImageName = (imageId: string, name: string) => {
    updateUserImageName(imageId, name);
    void renameUploadedUserImage(
      { orgSlug, id: imageId, name },
      renameUserImage,
    );
  };

  const handleCreate = () => {
    runWithRapidGuard(() => createMutation.mutate());
  };

  const handleGenerate = () => {
    runWithRapidGuard(() => generateMutation.mutate());
  };

  const generationStatus = canGenerate({
    balance: creditsData?.balance,
    apiKeyMode: creditsData?.apiKeyMode,
    hasCustomApiKeys: creditsData?.hasCustomApiKeys,
    model: publicModel,
    thumbnailCount,
  });
  const hasEnoughCreditsForCount = generationStatus.hasEnoughCredits;
  const isOutOfCredits = generationStatus.isOutOfCredits;

  const handleMetaEnter = useCallback(() => {
    if (isEditing) {
      if (!generateMutation.isPending && hasEnoughCreditsForCount) {
        runWithRapidGuard(() => generateMutation.mutate());
      }
    } else {
      if (!createMutation.isPending && hasEnoughCreditsForCount) {
        runWithRapidGuard(() => createMutation.mutate());
      }
    }
  }, [
    isEditing,
    generateMutation,
    createMutation,
    hasEnoughCreditsForCount,
    runWithRapidGuard,
  ]);

  const handleLoadPrompt = (promptText: string) => {
    setTextPrompt(promptText);
    setOriginalPrompt(promptText);
  };

  const handleReuse = (generation: GenerationWithThumbnails) => {
    const promptText = generation.editPrompt ?? generation.textPrompt;
    setTextPrompt(promptText);
    setOriginalPrompt(promptText);
    setPersonIds(generation.personIds);
    setInspirationIds(generation.inspirationIds);
    setUserImages(generation.userImages);
    setEditingImage(generation.baseImageUrl ?? null);
    setEditingThumbnailId(generation.baseThumbnailId ?? null);
  };

  const handleCancelGeneration = async (generationId: string) => {
    try {
      await cancelGeneration({ orgSlug, generationId });
      toast.success("Generation cancelled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel generation",
      );
    }
  };

  const handleBranch = async (
    thumbnailId: string,
    imageUrl: string,
    personIdsFromThumbnail: string[],
  ) => {
    setBranchingThumbnailId(thumbnailId);
    try {
      const inspiration = await createInspiration({
        orgSlug,
        type: "upload",
        imageUrls: [imageUrl],
      });

      const params = new URLSearchParams();
      params.set("inspiration", inspiration.id);
      if (personIdsFromThumbnail.length > 0) {
        params.set("persons", personIdsFromThumbnail.join(","));
      }

      router.push(`/orgs/${orgSlug}/thumbnails/new?${params.toString()}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create inspiration for branch",
      );
    } finally {
      setBranchingThumbnailId(null);
    }
  };

  const handleSelectGalleryImage = (imageUrl: string) => {
    const galleryImage = (galleryUserImages ?? []).find(
      (img) => img.imageUrl === imageUrl,
    );

    if (!galleryImage || userImages.some((img) => img.id === galleryImage.id))
      return;

    const added = addUserImage({
      id: galleryImage.id,
      imageUrl: galleryImage.imageUrl,
      description: galleryImage.description ?? "Uploaded image",
      name: galleryImage.name,
    });
    if (!added) {
      showImageLimitDialog();
    }
  };

  const handleAddToVideo = (thumbnailId: string) => {
    openVideoDialog(thumbnailId);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden p-0">
        <div className="relative border-b">
          <PromptEditor
            onMetaEnter={handleMetaEnter}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (items) {
                for (const item of items) {
                  if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file && canAddImages(1)) {
                      handleUpload(file).catch(() => undefined);
                    } else if (file) {
                      showImageLimitDialog();
                    }
                    break;
                  }
                }
              }
            }}
          />
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isEnhancing}
              onClick={handleEnhance}
            >
              {isEnhancing ? (
                <Loader className="size-4" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <ReferenceSection
            icon={<ImageIcon className="size-4" />}
            title="Images"
            description={
              <Link
                href="/docs/guides/images-guide"
                className="hover:underline"
              >
                Learn how to use images
              </Link>
            }
            hasContent={userImages.length > 0}
          >
            <div className="border-input flex flex-col gap-1 rounded-xl border border-dashed p-2">
              <UploadedImagesList
                images={userImages}
                onRemove={removeUserImage}
                onEditName={handleEditImageName}
              />
              <UploadedImagesAddButton
                onFilesSelected={handleMultipleFilesSelected}
                currentCount={userImages.length}
                maxCount={userImages.length + getRemainingImageSlots()}
                isUploading={isUploading}
              />
              <UserImageGallery
                orgSlug={orgSlug}
                onSelect={handleSelectGalleryImage}
              />
            </div>
          </ReferenceSection>

          <ReferenceSection
            icon={<LinkIcon className="size-4" />}
            title="Style References"
            description="Use the style of an image"
            hasContent={inspirationIds.length > 0 || Boolean(editingImage)}
          >
            {editingImage ? (
              <div className="border-input rounded-xl border border-dashed p-2">
                <div className="flex items-center gap-3 rounded-lg p-2">
                  <Image
                    src={editingImage}
                    alt="Editing image"
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded object-cover"
                  />
                  <span className="text-muted-foreground flex-1 truncate text-sm">
                    Editing image
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-muted-foreground hover:text-destructive shrink-0 p-1 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <InspirationMultiSelector
                value={inspirationIds}
                onChange={setInspirationIds}
              />
            )}
          </ReferenceSection>

          <ReferenceSection
            icon={<User className="size-4" />}
            title="Persons"
            description="Use a person's likeness"
            hasContent={personIds.length > 0}
          >
            <PersonMultiSelector
              value={personIds}
              onChange={setPersonIds}
              placeholder="Select persons"
            />
          </ReferenceSection>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <CreditBalance />

        <div className="flex flex-1 items-center justify-end gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            value={aspectRatio}
            onValueChange={(value) => {
              if (value) setAspectRatio(value as AspectRatio);
            }}
            size="sm"
          >
            <ToggleGroupItem
              value="16:9"
              className="h-8 w-8"
              aria-label="YouTube (16:9)"
            >
              <RectangleHorizontal className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="9:16"
              className="h-8 w-8"
              aria-label="Story (9:16)"
            >
              <RectangleVertical className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="1:1"
              className="h-8 w-8"
              aria-label="Square (1:1)"
            >
              <Square className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Select
            value={publicModel}
            onValueChange={(value) => setModel(value as ImageModel)}
          >
            <SelectTrigger
              size="sm"
              className="bg-background dark:bg-background"
            >
              <SelectValue>
                {IMAGE_MODELS[publicModel].provider === "openai" ? (
                  <span className="flex items-center gap-1.5">
                    <Image
                      src="/images/openai.svg"
                      alt="OpenAI"
                      width={14}
                      height={14}
                      className="size-3.5 dark:invert"
                    />
                    {IMAGE_MODELS[publicModel].shortLabel}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Banana className="size-3.5 text-yellow-500" />
                    {IMAGE_MODELS[publicModel].shortLabel}
                    {publicModel === "gemini-3.1-flash" && (
                      <Star
                        className="size-3 fill-yellow-500 text-yellow-500"
                        aria-label="Recommended"
                      />
                    )}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {getPublicImageModels().map((m) => {
                const isGptImage = m.provider === "openai";
                const isDisabled = isGptImage && !creditsData?.gptImageAccess;
                const isRecommended = m.id === "gemini-3.1-flash";

                if (isDisabled) {
                  return (
                    <Tooltip key={m.id}>
                      <TooltipTrigger asChild>
                        <div className="relative flex cursor-not-allowed items-center rounded-sm px-2 py-1.5 text-sm opacity-50 outline-none select-none">
                          <div className="flex items-center gap-2">
                            <Image
                              src="/images/openai.svg"
                              alt="OpenAI"
                              width={16}
                              height={16}
                              className="size-4 dark:invert"
                            />
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1.5">
                                {m.label}
                                {isRecommended && (
                                  <Star
                                    className="size-3 fill-yellow-500 text-yellow-500"
                                    aria-label="Recommended"
                                  />
                                )}
                                <span className="text-muted-foreground ml-1 text-xs">
                                  (Pro)
                                </span>
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {m.pickerDetails}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Upgrade to Pro to access GPT Image 2
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      {isGptImage ? (
                        <Image
                          src="/images/openai.svg"
                          alt="OpenAI"
                          width={16}
                          height={16}
                          className="size-4 dark:invert"
                        />
                      ) : (
                        <Banana className="size-4 text-yellow-500" />
                      )}
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5">
                          {m.label}
                          {isRecommended && (
                            <Star
                              className="size-3 fill-yellow-500 text-yellow-500"
                              aria-label="Recommended"
                            />
                          )}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {m.pickerDetails}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            variant="outline"
            value={String(thumbnailCount)}
            onValueChange={(value) => {
              if (value) setThumbnailCount(Number(value));
            }}
            size="sm"
          >
            {[1, 2, 3, 4].map((count) => {
              const isDisabled = count > maxGenerations;

              if (isDisabled) {
                return (
                  <Tooltip key={count}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value={String(count)}
                        className="h-8 w-8 text-xs data-[disabled]:cursor-not-allowed"
                        disabled
                      >
                        {count}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      Upgrade to Pro to generate up to 4 variations at once
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <ToggleGroupItem
                  key={count}
                  value={String(count)}
                  className="h-8 w-8 text-xs"
                >
                  {count}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          {!isEditing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={
                    createMutation.isPending || !hasEnoughCreditsForCount
                  }
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader className="mr-2 size-4" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-accent [&_svg]:fill-accent [&_svg]:bg-accent text-white [&_kbd]:!bg-white/20 [&_kbd]:!text-white">
                <Kbd>⌘</Kbd> + <Kbd>Enter</Kbd>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={
                    generateMutation.isPending || !hasEnoughCreditsForCount
                  }
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader className="mr-2 size-4" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-accent [&_svg]:fill-accent [&_svg]:bg-accent text-white [&_kbd]:!bg-white/20 [&_kbd]:!text-white">
                <Kbd>⌘</Kbd> + <Kbd>Enter</Kbd>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {isOutOfCredits && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">You&apos;re out of thumbnails</p>
            <p className="text-muted-foreground text-xs">
              Share your referral link or upgrade to keep generating thumbnails.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => openReferralDialog(orgSlug)}
            >
              Share &amp; earn free thumbnails
            </Button>
            <Button type="button" onClick={() => openGlobalDialog("org-plan")}>
              Upgrade to Pro
            </Button>
          </div>
        </Card>
      )}

      {showRemoveWatermarkCta && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
              <Droplets className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Remove watermark</p>
              <p className="text-muted-foreground text-xs">
                Upgrade to any paid plan to export thumbnails without the
                thumbfa.st wordmark.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={() => openGlobalDialog("org-plan")}
          >
            Remove watermark
          </Button>
        </Card>
      )}

      {isEditing && prompt && (
        <GenerationGallery
          orgSlug={orgSlug}
          generations={prompt.generations}
          onEdit={handleEditImage}
          onLoadPrompt={handleLoadPrompt}
          onReuse={handleReuse}
          onCancelGeneration={handleCancelGeneration}
          onBranch={handleBranch}
          branchingThumbnailId={branchingThumbnailId}
          onAddToVideo={handleAddToVideo}
          onSocialMediaSet={(_thumbnailId, imageUrl, generation) => {
            setSocialMediaSetData({ imageUrl, generation });
          }}
        />
      )}

      {prompt && socialMediaSetData && (
        <SocialMediaSetDialog
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setSocialMediaSetData(null);
          }}
          thumbnailImageUrl={socialMediaSetData.imageUrl}
          currentAspectRatio={socialMediaSetData.generation.aspectRatio}
          orgSlug={orgSlug}
          promptId={prompt.id}
          textPrompt={socialMediaSetData.generation.textPrompt}
          personIds={socialMediaSetData.generation.personIds}
          inspirationIds={socialMediaSetData.generation.inspirationIds}
          userImageIds={socialMediaSetData.generation.userImageIds}
        />
      )}

      <VideoSelectorDialog
        open={videoDialogState.open}
        onOpenChange={(open) => {
          if (!open) closeVideoDialog();
        }}
        orgSlug={orgSlug}
        thumbnailId={videoDialogState.thumbnailId ?? ""}
        onSuccess={handleVideoSuccess}
      />
    </div>
  );
}

type ReferenceSectionProps = {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  hasContent: boolean;
  children: React.ReactNode;
};

function ReferenceSection({
  icon,
  title,
  description,
  hasContent,
  children,
}: ReferenceSectionProps) {
  return (
    <div className="flex min-h-[120px] flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-muted-foreground",
            hasContent && "text-foreground",
          )}
        >
          {icon}
        </span>
        <div className="flex flex-col">
          <span
            className={cn(
              "text-muted-foreground text-sm leading-tight font-medium",
              hasContent && "text-foreground",
            )}
          >
            {title}
          </span>
          <span className="text-muted-foreground text-xs leading-tight">
            {description}
          </span>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
