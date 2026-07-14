import { MultiImageUploader } from "@/components/multi-image-uploader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutation } from "@/hooks/use-async-mutation";
import { useAction as useConvexAction } from "convex/react";
import {
  AlertTriangle,
  Coins,
  Info,
  Link,
  Loader2,
  Plus,
  RotateCcw,
  UserX,
} from "lucide-react";
import Image from "@/compat/image";
import { useParams, useRouter } from "@/compat/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createInspirationRef,
  uploadInspirationImageRef,
} from "./inspiration.convex";
import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  BorderedDialogHeader,
  DialogEscClose,
} from "@/components/bordered-dialog";
import type { CreateInspirationInput } from "./inspiration.schema";
import {
  extractVideoId,
  getThumbnailUrl,
  isValidYoutubeUrl,
} from "./youtube-utils";
import { BulkImportDialog } from "./bulk-import-dialog";

type InspirationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (inspirationId: string) => void;
};

type DialogPhase = "idle" | "loading" | "done" | "error";

type MutationResult = {
  id: string;
  thumbnailUrls: string[];
};

type AnonymizeOptions = {
  subject: boolean;
  text: boolean;
  logos: boolean;
};

const DEFAULT_ANONYMIZE_OPTIONS: AnonymizeOptions = {
  subject: true,
  text: false,
  logos: false,
};

function hasSelectedAnonymizeOptions(options: AnonymizeOptions) {
  return options.subject || options.text || options.logos;
}

export function InspirationDialog({
  open,
  onOpenChange,
  onSuccess,
}: InspirationDialogProps) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const router = useRouter();
  const createInspiration = useConvexAction(createInspirationRef);
  const uploadInspirationImage = useConvexAction(uploadInspirationImageRef);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [anonymizeOptions, setAnonymizeOptions] = useState<AnonymizeOptions>(
    DEFAULT_ANONYMIZE_OPTIONS,
  );
  const [pendingAnonymizeOptions, setPendingAnonymizeOptions] =
    useState<AnonymizeOptions | null>(null);
  const [phase, setPhase] = useState<DialogPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [resultData, setResultData] = useState<MutationResult | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pendingAnonymizeOptionsRef = useRef<AnonymizeOptions | null>(null);

  const videoId = extractVideoId(youtubeUrl);
  const youtubePreviewUrl = videoId ? getThumbnailUrl(videoId) : null;
  const hasYoutubeUrl = isValidYoutubeUrl(youtubeUrl);
  const hasUploadedImages = uploadedImageUrls.length > 0;

  const mode: "youtube" | "upload" | null = hasYoutubeUrl
    ? "youtube"
    : hasUploadedImages
      ? "upload"
      : null;

  const isValid = mode !== null;
  const pendingAnonymize =
    pendingAnonymizeOptions !== null &&
    hasSelectedAnonymizeOptions(pendingAnonymizeOptions);
  const canAnonymize = hasSelectedAnonymizeOptions(anonymizeOptions);

  const estimatedTimeMs = 25000;

  useEffect(() => {
    if (phase === "loading") {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const rawProgress = (elapsed / estimatedTimeMs) * 90;
        setProgress(Math.min(rawProgress, 90));
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, estimatedTimeMs]);

  useEffect(() => {
    const ref = phaseTimeoutRef;
    return () => {
      if (ref.current) {
        clearTimeout(ref.current);
      }
    };
  }, []);

  const resetForm = useCallback(() => {
    setYoutubeUrl("");
    setUploadedImageUrls([]);
    setAnonymizeOptions(DEFAULT_ANONYMIZE_OPTIONS);
    setPendingAnonymizeOptions(null);
    pendingAnonymizeOptionsRef.current = null;
    setPhase("idle");
    setProgress(0);
    setResultData(null);
  }, []);

  const createMutation = useMutation({
    mutationFn: async (input: CreateInspirationInput) => {
      return createInspiration({ orgSlug, ...input });
    },
    onSuccess: (data) => {
      const wasAnonymize =
        pendingAnonymizeOptionsRef.current !== null &&
        hasSelectedAnonymizeOptions(pendingAnonymizeOptionsRef.current);
      setProgress(100);
      setResultData({
        id: data.id,
        thumbnailUrls: data.thumbnailUrls,
      });

      if (!wasAnonymize) {
        toast.success("Inspiration created");
        onSuccess?.(data.id);
        resetForm();
        onOpenChange(false);
        return;
      }

      phaseTimeoutRef.current = setTimeout(() => {
        setPhase("done");
      }, 300);
    },
    onError: (error) => {
      const wasAnonymize =
        pendingAnonymizeOptionsRef.current !== null &&
        hasSelectedAnonymizeOptions(pendingAnonymizeOptionsRef.current);
      toast.error(error.message);
      if (wasAnonymize) {
        setPhase("error");
      } else {
        setPhase("idle");
      }
      setProgress(0);
    },
  });

  const handleUpload = async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      return uploadInspirationImage({
        orgSlug,
        bytes: await file.arrayBuffer(),
        fileName: file.name,
        contentType: file.type,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = (options: AnonymizeOptions | null) => {
    const selectedOptions =
      options && hasSelectedAnonymizeOptions(options) ? options : null;
    setPendingAnonymizeOptions(selectedOptions);
    pendingAnonymizeOptionsRef.current = selectedOptions;
    setPhase("loading");
    setProgress(0);
    const anonymizeInput = selectedOptions
      ? {
          anonymizeSubject: selectedOptions.subject,
          anonymizeText: selectedOptions.text,
          anonymizeLogos: selectedOptions.logos,
        }
      : {};
    if (mode === "youtube") {
      createMutation.mutate({ type: "youtube", youtubeUrl, ...anonymizeInput });
    } else if (mode === "upload") {
      createMutation.mutate({
        type: "upload",
        imageUrls: uploadedImageUrls,
        ...anonymizeInput,
      });
    }
  };

  const handleClose = () => {
    if (resultData) {
      toast.success("Inspiration created");
      onSuccess?.(resultData.id);
    }
    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (phase === "loading") return;
      if (phase === "done") {
        handleClose();
        return;
      }
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const previewImageUrl =
    phase === "done" && resultData?.thumbnailUrls[0]
      ? resultData.thumbnailUrls[0]
      : (youtubePreviewUrl ?? uploadedImageUrls[0]);

  const updateAnonymizeOption = (
    key: keyof AnonymizeOptions,
    checked: boolean,
  ) => {
    setAnonymizeOptions((current) => ({ ...current, [key]: checked }));
  };

  const renderPreview = (imageUrl: string) => (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-neutral-100 dark:bg-neutral-800">
      <Image
        src={imageUrl}
        alt={phase === "done" ? "Created inspiration" : "Thumbnail preview"}
        fill
        sizes="100vw"
        className={`object-cover transition-opacity duration-300 ${phase === "loading" ? "opacity-50" : ""}`}
        unoptimized
      />
      {phase === "loading" && (
        <>
          <div
            className="absolute inset-y-0 left-0 bg-black/40 transition-[width] duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white drop-shadow-md" />
          </div>
        </>
      )}
      {phase === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
          <AlertTriangle className="size-8 text-red-400 drop-shadow-md" />
          <span className="text-sm font-medium text-white drop-shadow-md">
            Anonymization failed
          </span>
        </div>
      )}
    </div>
  );

  const renderAnonymizeOption = (
    key: keyof AnonymizeOptions,
    label: string,
    description: string,
  ) => {
    const id = `anonymize-${key}`;
    return (
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <label
            htmlFor={id}
            className="min-w-0 cursor-pointer text-sm font-medium"
          >
            {label}
          </label>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground inline-flex size-5 items-center justify-center rounded-full transition-colors"
                aria-label={`${label} information`}
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              hideArrow
              side="left"
              sideOffset={8}
              className="max-w-60 border border-white/10 bg-black px-3 py-2 text-xs leading-4 text-white shadow-xl"
            >
              {description}
            </TooltipContent>
          </Tooltip>
        </div>
        <Switch
          id={id}
          checked={anonymizeOptions[key]}
          onCheckedChange={(checked) => updateAnonymizeOption(key, checked)}
          disabled={createMutation.isPending || phase !== "idle"}
        />
      </div>
    );
  };

  const renderActionPanel = () => (
    <aside className="flex min-w-0 flex-col gap-3 lg:w-64 lg:shrink-0">
      <div className="bg-background rounded-lg border p-3">
        <div className="border-border flex items-center justify-between gap-3 border-b pb-3">
          <p className="text-sm font-medium">Anonymize</p>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            1
            <Coins className="size-3" />
          </span>
        </div>
        <div className="divide-border divide-y">
          {renderAnonymizeOption(
            "subject",
            "Anonymize subject",
            "Replace humans with neutral blank clay wireframe placeholders. No face, no smile.",
          )}
          {renderAnonymizeOption(
            "text",
            "Anonymize text",
            "Replace each text block with numbered lorem placeholders like Lorem 1, Ipsum 2.",
          )}
          {renderAnonymizeOption(
            "logos",
            "Anonymize logo",
            "Replace each logo with a flat numbered square placeholder.",
          )}
        </div>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleCreate(anonymizeOptions)}
          disabled={
            createMutation.isPending ||
            !isValid ||
            !canAnonymize ||
            phase !== "idle"
          }
          className="mt-3 h-10 w-full bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:ring-red-500 dark:bg-red-600 dark:hover:bg-red-500"
        >
          <UserX className="size-4" />
          Anonymize
        </Button>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleCreate(null)}
        disabled={createMutation.isPending || !isValid || phase !== "idle"}
        className="bg-background h-12 w-full justify-between border px-3"
      >
        <span className="flex items-center gap-1.5">
          <Plus className="size-3.5" />
          Create only
        </span>
        <span className="flex items-center gap-1">
          0.1
          <Coins className="size-3" />
        </span>
      </Button>
    </aside>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <BorderedDialogContent maxWidth="sm:max-w-5xl">
          <BorderedDialogHeader title="">
            <DialogTitle className="text-base">Add Inspiration</DialogTitle>
            {phase === "idle" && !hasYoutubeUrl && !hasUploadedImages && (
              <DialogDescription className="text-sm">
                Paste a YouTube URL, upload images, or draw a composition
              </DialogDescription>
            )}
          </BorderedDialogHeader>

          <BorderedDialogBody>
            {phase === "idle" && !hasUploadedImages && (
              <div className="relative">
                <Link className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={createMutation.isPending}
                  className="pl-9"
                />
              </div>
            )}

            {previewImageUrl ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="flex min-w-0 flex-col gap-3">
                  {renderPreview(previewImageUrl)}
                  {phase === "idle" && hasUploadedImages && !hasYoutubeUrl && (
                    <MultiImageUploader
                      images={uploadedImageUrls}
                      onImagesChange={setUploadedImageUrls}
                      onUpload={handleUpload}
                      maxImages={5}
                      isUploading={isUploading}
                      disabled={createMutation.isPending}
                      imageSize="sm"
                      compact
                    />
                  )}
                </div>
                {renderActionPanel()}
              </div>
            ) : phase === "idle" ? (
              <>
                {!hasYoutubeUrl && !hasUploadedImages && (
                  <div className="flex items-center gap-3">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-xs font-medium uppercase">
                      or
                    </span>
                    <div className="bg-border h-px flex-1" />
                  </div>
                )}

                {!hasYoutubeUrl && (
                  <MultiImageUploader
                    images={uploadedImageUrls}
                    onImagesChange={setUploadedImageUrls}
                    onUpload={handleUpload}
                    maxImages={5}
                    isUploading={isUploading}
                    disabled={createMutation.isPending}
                    imageSize="sm"
                    compact
                  />
                )}

                {!hasYoutubeUrl && !hasUploadedImages && (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        setBulkImportOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                    >
                      Or import images in bulk
                    </button>
                    <div className="bg-border h-px w-full" />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        onOpenChange(false);
                        router.push(`/orgs/${orgSlug}/inspirations/draw`);
                      }}
                    >
                      Draw inspiration
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </BorderedDialogBody>

          <BorderedDialogFooter>
            {phase === "loading" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>
                    {progress >= 90
                      ? "Image generation can take longer..."
                      : pendingAnonymize
                        ? "Anonymizing..."
                        : "Creating..."}
                  </span>
                </div>
                <span className="tabular-nums">{Math.round(progress)}%</span>
              </>
            ) : phase === "error" ? (
              <>
                <DialogEscClose />
                <Button
                  size="sm"
                  onClick={() =>
                    handleCreate(pendingAnonymizeOptions ?? anonymizeOptions)
                  }
                >
                  <RotateCcw className="size-3" />
                  Retry 1
                  <Coins className="size-3" />
                </Button>
              </>
            ) : phase === "done" ? (
              <>
                <DialogEscClose />
                <div className="flex items-center gap-2">
                  {pendingAnonymize && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCreate(pendingAnonymizeOptions)}
                    >
                      <RotateCcw className="size-3" />
                      Retry 1
                      <Coins className="size-3" />
                    </Button>
                  )}
                  <Button size="sm" onClick={handleClose}>
                    Create
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogEscClose />
                <span />
              </>
            )}
          </BorderedDialogFooter>
        </BorderedDialogContent>
      </Dialog>

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
      />
    </>
  );
}
