import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Typography } from "@/components/nowts/typography";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ImageIcon as ThumbnailIcon,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Replace,
  RotateCcw,
  UserX,
} from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  anonymizeInspirationRef,
  copyInspirationRef,
  updateInspirationImagesRef,
} from "./inspiration.convex";
import type { InspirationListItem } from "./inspiration.query";
import {
  inspirationDetailRef,
  isAnonymizedInspiration,
} from "./inspiration.query";
import { extractVideoId, getThumbnailUrl } from "./youtube-utils";
import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  BorderedDialogHeader,
  DialogEscClose,
} from "@/components/bordered-dialog";
import { PixelateEditorDialog } from "./pixelate-editor-dialog";
import { uploadPixelatedImageRef } from "./pixelate.convex";

type AnonymizePhase = "idle" | "loading" | "done" | "error";

type InspirationDetailDialogProps = {
  inspiration: InspirationListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImagesUpdated?: (newUrls: string[]) => void;
  onInspirationCopied?: (newInspiration: InspirationListItem) => void;
  onInspirationAnonymized?: (updatedInspiration: InspirationListItem) => void;
  currentOrgId: string;
  orgSlug?: string;
};

type InspirationSourceVideoCardProps = {
  inspiration: Pick<
    InspirationListItem,
    | "name"
    | "thumbnailUrls"
    | "youtubeUrl"
    | "sourceVideoTitle"
    | "sourceVideoAuthor"
    | "sourceVideoThumbnailUrl"
  >;
};

export function InspirationSourceVideoCard({
  inspiration,
}: InspirationSourceVideoCardProps) {
  if (!inspiration.youtubeUrl) return null;

  const sourceTitle = inspiration.sourceVideoTitle ?? inspiration.name;
  const videoId = extractVideoId(inspiration.youtubeUrl);
  if (!videoId) return null;

  const youtubeThumbnail = videoId ? getThumbnailUrl(videoId) : null;
  const sourceThumbnail =
    inspiration.sourceVideoThumbnailUrl ??
    youtubeThumbnail ??
    inspiration.thumbnailUrls[0];

  return (
    <section className="group bg-muted/15 hover:bg-muted/25 flex items-center gap-2.5 rounded-md border px-2.5 py-2 transition-colors">
      <div className="relative h-9 w-16 shrink-0 overflow-hidden rounded border bg-neutral-100 dark:bg-neutral-800">
        {sourceThumbnail ? (
          <Image
            src={sourceThumbnail}
            alt={sourceTitle}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ThumbnailIcon className="text-muted-foreground size-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Typography variant="small" className="truncate">
          {sourceTitle}
        </Typography>
        {inspiration.sourceVideoAuthor ? (
          <Typography variant="muted" className="truncate text-xs">
            {inspiration.sourceVideoAuthor}
          </Typography>
        ) : null}
      </div>
      <Button size="icon" variant="ghost" className="size-8 shrink-0" asChild>
        <Link
          href={inspiration.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open source video: ${sourceTitle}`}
        >
          <ExternalLink className="size-3.5" />
        </Link>
      </Button>
    </section>
  );
}

export function InspirationDetailDialog({
  inspiration,
  open,
  onOpenChange,
  onImagesUpdated,
  onInspirationCopied,
  onInspirationAnonymized,
  currentOrgId,
  orgSlug,
}: InspirationDetailDialogProps) {
  const anonymizeInspiration = useConvexAction(anonymizeInspirationRef);
  const uploadPixelatedImage = useConvexAction(uploadPixelatedImageRef);
  const copyInspiration = useConvexMutation(copyInspirationRef);
  const updateInspirationImages = useConvexMutation(updateInspirationImagesRef);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(
    null,
  );
  const [localInspiration, setLocalInspiration] = useState<{
    sourceId: string;
    inspiration: InspirationListItem;
  } | null>(null);
  const [localThumbnailUrls, setLocalThumbnailUrls] = useState<{
    sourceId: string;
    urls: string[];
  } | null>(null);
  const [anonymizePhase, setAnonymizePhase] = useState<AnonymizePhase>("idle");
  const [showAnonymizeConfirm, setShowAnonymizeConfirm] = useState(false);

  const freshDetail = useConvexQuery(
    inspirationDetailRef,
    open && orgSlug && inspiration?.id
      ? { orgSlug, inspirationId: inspiration.id }
      : "skip",
  );

  const currentInspiration =
    inspiration && localInspiration?.sourceId === inspiration.id
      ? localInspiration.inspiration
      : inspiration;
  const resolvedInspiration =
    freshDetail && !(freshDetail instanceof Error)
      ? freshDetail
      : currentInspiration;
  const thumbnailUrls =
    inspiration && localThumbnailUrls?.sourceId === inspiration.id
      ? localThumbnailUrls.urls
      : (currentInspiration?.thumbnailUrls ?? []);

  const editingImageUrl =
    editingImageIndex !== null ? thumbnailUrls[editingImageIndex] : null;

  if (!inspiration || !currentInspiration || !resolvedInspiration) return null;

  const isOwner = resolvedInspiration.orgId === currentOrgId;
  const isAlreadyAnonymized = isAnonymizedInspiration(resolvedInspiration);

  const handleSavePixelatedImage = async (dataUrl: string) => {
    if (editingImageIndex === null || !orgSlug) return;

    let targetInspiration = currentInspiration;

    if (!isOwner) {
      const copyResult = await copyInspiration({
        orgSlug,
        inspirationId: currentInspiration.id,
      });

      targetInspiration = {
        ...copyResult,
        category: copyResult.category as InspirationListItem["category"],
      };

      setLocalInspiration({
        sourceId: inspiration.id,
        inspiration: targetInspiration,
      });
      onInspirationCopied?.(targetInspiration);
      toast.success("Inspiration copied to your library");
    }

    const originalUrl = thumbnailUrls[editingImageIndex];
    if (!originalUrl) return;
    const newUrl = await uploadPixelatedImage({
      orgSlug,
      imageDataUrl: dataUrl,
      originalUrl,
    });
    const newUrls = [...thumbnailUrls];
    newUrls[editingImageIndex] = newUrl;
    setLocalThumbnailUrls({ sourceId: inspiration.id, urls: newUrls });

    await updateInspirationImages({
      orgSlug,
      inspirationId: targetInspiration.id,
      thumbnailUrls: newUrls,
    });

    toast.success("Image pixelated and saved");
    onImagesUpdated?.(newUrls);
    setEditingImageIndex(null);
  };

  const handleAnonymize = () => {
    if (isAlreadyAnonymized) return;
    setShowAnonymizeConfirm(true);
  };

  const handleAnonymizeConfirm = async (mode: "replace" | "duplicate") => {
    if (!orgSlug) return;
    setShowAnonymizeConfirm(false);

    setAnonymizePhase("loading");

    try {
      const result = await anonymizeInspiration({
        orgSlug,
        inspirationId: currentInspiration.id,
        mode,
      });

      setAnonymizePhase("done");

      const updatedInspiration: InspirationListItem = {
        ...result,
        category: result.category as InspirationListItem["category"],
      };

      setLocalThumbnailUrls({
        sourceId: inspiration.id,
        urls: updatedInspiration.thumbnailUrls,
      });
      setLocalInspiration({
        sourceId: inspiration.id,
        inspiration: updatedInspiration,
      });

      if (mode === "replace") {
        onInspirationAnonymized?.(updatedInspiration);
      } else {
        onInspirationCopied?.(updatedInspiration);
      }

      toast.success(
        mode === "replace"
          ? "Inspiration anonymized"
          : "Anonymized copy created",
      );
    } catch (error) {
      setAnonymizePhase("error");
      toast.error(
        error instanceof Error ? error.message : "Failed to anonymize",
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAnonymizePhase("idle");
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <BorderedDialogContent>
          <BorderedDialogHeader title="">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base">
                {inspiration.name}
              </DialogTitle>
              {inspiration.category && (
                <Badge variant="secondary">{inspiration.category}</Badge>
              )}
            </div>
            <DialogDescription className="text-sm">
              Added {formatDistanceToNow(new Date(inspiration.createdAt))} ago
            </DialogDescription>
          </BorderedDialogHeader>

          <BorderedDialogBody>
            {thumbnailUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="group relative aspect-video w-full overflow-hidden rounded-lg border bg-neutral-100 dark:bg-neutral-800"
              >
                <Image
                  src={url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="100vw"
                  className={`object-cover transition-opacity duration-300 ${anonymizePhase === "loading" ? "opacity-50" : ""}`}
                  unoptimized
                />
                {anonymizePhase === "loading" && index === 0 && (
                  <>
                    <div className="absolute inset-0 animate-pulse bg-red-500/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="size-6 animate-spin text-white drop-shadow-md" />
                    </div>
                  </>
                )}
                {anonymizePhase === "error" && index === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                    <AlertTriangle className="size-8 text-red-400 drop-shadow-md" />
                    <span className="text-sm font-medium text-white drop-shadow-md">
                      Anonymization failed
                    </span>
                  </div>
                )}
              </div>
            ))}

            {inspiration.aiDescription && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium uppercase">
                  AI Description
                </span>
                <p className="text-sm leading-relaxed">
                  {inspiration.aiDescription}
                </p>
              </div>
            )}

            <InspirationSourceVideoCard inspiration={resolvedInspiration} />
          </BorderedDialogBody>

          <BorderedDialogFooter>
            {anonymizePhase === "loading" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Anonymizing...</span>
                </div>
              </>
            ) : anonymizePhase === "error" && !isAlreadyAnonymized ? (
              <>
                <DialogEscClose />
                <Button size="sm" onClick={() => handleAnonymize()}>
                  <RotateCcw className="size-3" />
                  Retry 1
                  <ThumbnailIcon className="size-3" />
                </Button>
              </>
            ) : (
              <>
                <DialogEscClose />
                <div className="flex items-center gap-2">
                  {orgSlug && currentInspiration.hasDrawing ? (
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        href={`/orgs/${orgSlug}/inspirations/draw/${currentInspiration.id}`}
                      >
                        <Pencil className="size-3" />
                        Edit drawing
                      </Link>
                    </Button>
                  ) : null}
                  {orgSlug && (
                    <Button size="sm" variant="secondary" asChild>
                      <Link
                        href={`/orgs/${orgSlug}/inspirations/${currentInspiration.id}`}
                        target="_blank"
                      >
                        <ExternalLink className="size-3" />
                        View Details
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingImageIndex(0)}
                    disabled={thumbnailUrls.length === 0}
                  >
                    <Pencil className="size-3" />
                    Pixelate
                  </Button>
                  {!isAlreadyAnonymized && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleAnonymize}
                        >
                          <UserX className="size-3.5" />
                          Anonymize 1
                          <ThumbnailIcon className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 text-center">
                        <p>
                          Replaces all people in the thumbnail with a
                          placeholder mannequin using AI.
                        </p>
                        <Link
                          href="/docs/guides/anonymize-inspiration"
                          target="_blank"
                          className="text-primary-foreground/80 mt-1 inline-block underline"
                        >
                          Learn more
                        </Link>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </>
            )}
          </BorderedDialogFooter>
        </BorderedDialogContent>
      </Dialog>

      <AlertDialog
        open={showAnonymizeConfirm}
        onOpenChange={setShowAnonymizeConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anonymize Inspiration</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all people in the thumbnail with placeholder
              mannequins. This uses 1 thumbnail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {isOwner && (
              <AlertDialogAction
                onClick={async () => handleAnonymizeConfirm("replace")}
              >
                <Replace className="size-3.5" />
                Replace Original
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={async () => handleAnonymizeConfirm("duplicate")}
            >
              <Copy className="size-3.5" />
              {isOwner ? "Duplicate" : "Create Copy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingImageUrl && (
        <PixelateEditorDialog
          imageUrl={editingImageUrl}
          open={editingImageIndex !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingImageIndex(null);
          }}
          onSave={handleSavePixelatedImage}
        />
      )}
    </>
  );
}
