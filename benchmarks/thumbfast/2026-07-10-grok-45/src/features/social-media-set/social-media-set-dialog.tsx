import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "@/components/nowts/loader";
import {
  ASPECT_RATIO_CONFIG,
  getAspectRatioClass,
  type AspectRatio,
} from "@/lib/ai/aspect-ratio";
import { cn } from "@/lib/utils";
import { RectangleHorizontal, RectangleVertical, Square } from "lucide-react";
import Image from "@/compat/image";
import { useState } from "react";
import { useMutation as useConvexMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { toast } from "sonner";
import { useEditorStore } from "@/features/editor/editor.store";

const RATIO_ICONS: Record<AspectRatio, React.ReactNode> = {
  "16:9": <RectangleHorizontal className="size-5" />,
  "9:16": <RectangleVertical className="size-5" />,
  "1:1": <Square className="size-5" />,
};

const createThumbnailGenerationRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    promptId: string;
    count: number;
    prompt: string;
    personIds: string[];
    inspirationIds: string[];
    userImageIds: string[];
    baseImageUrl: string;
    editPrompt: string;
    model: string;
    aspectRatio: AspectRatio;
  },
  unknown
>("editor:createThumbnailGeneration");

type SocialMediaSetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thumbnailImageUrl: string;
  currentAspectRatio: string;
  orgSlug: string;
  promptId: string;
  textPrompt: string;
  personIds: string[];
  inspirationIds: string[];
  userImageIds: string[];
  onSuccess?: () => void;
};

export function SocialMediaSetDialog({
  open,
  onOpenChange,
  thumbnailImageUrl,
  currentAspectRatio,
  orgSlug,
  promptId,
  textPrompt,
  personIds,
  inspirationIds,
  userImageIds,
  onSuccess,
}: SocialMediaSetDialogProps) {
  const model = useEditorStore((s) => s.model);
  const safeCurrentRatio: AspectRatio =
    currentAspectRatio in ASPECT_RATIO_CONFIG
      ? (currentAspectRatio as AspectRatio)
      : "16:9";
  const availableRatios = (
    Object.keys(ASPECT_RATIO_CONFIG) as AspectRatio[]
  ).filter((r) => r !== safeCurrentRatio);

  const [selectedRatios, setSelectedRatios] =
    useState<AspectRatio[]>(availableRatios);
  const [isGenerating, setIsGenerating] = useState(false);
  const createThumbnailGeneration = useConvexMutation(
    createThumbnailGenerationRef,
  );

  const toggleRatio = (ratio: AspectRatio) => {
    setSelectedRatios((prev) =>
      prev.includes(ratio) ? prev.filter((r) => r !== ratio) : [...prev, ratio],
    );
  };

  const handleGenerate = async () => {
    if (selectedRatios.length === 0) return;
    setIsGenerating(true);

    try {
      const results = await Promise.allSettled(
        selectedRatios.map(async (ratio) => {
          const config = ASPECT_RATIO_CONFIG[ratio];
          const editPrompt = `Adapt this thumbnail to ${ratio} format (${config.width}x${config.height}). Keep the same subject, style, colors, and composition. Reframe and crop appropriately for the new aspect ratio.`;

          return createThumbnailGeneration({
            orgSlug,
            promptId,
            count: 1,
            prompt: textPrompt,
            personIds,
            inspirationIds,
            userImageIds,
            baseImageUrl: thumbnailImageUrl,
            editPrompt,
            model,
            aspectRatio: ratio,
          });
        }),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed > 0 && succeeded > 0) {
        toast.warning(`${succeeded} variation(s) started, ${failed} failed`);
      } else if (failed > 0) {
        toast.error("Failed to generate variations");
      } else {
        toast.success(`Generating ${succeeded} social media variation(s)`);
      }

      if (succeeded > 0) {
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Social Media Set</DialogTitle>
          <DialogDescription>
            Generate this thumbnail in other formats
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="bg-muted overflow-hidden rounded-lg p-2">
            <div
              className={cn(
                "relative mx-auto w-full max-w-[200px] overflow-hidden rounded",
                getAspectRatioClass(currentAspectRatio),
              )}
            >
              <Image
                src={thumbnailImageUrl}
                alt="Original thumbnail"
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
            <p className="text-muted-foreground mt-2 text-center text-xs">
              Current: {ASPECT_RATIO_CONFIG[safeCurrentRatio].label} (
              {safeCurrentRatio})
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {availableRatios.map((ratio) => {
              const config = ASPECT_RATIO_CONFIG[ratio];
              const isSelected = selectedRatios.includes(ratio);
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => toggleRatio(ratio)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {RATIO_ICONS[ratio]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {config.width}x{config.height} ({ratio})
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {isSelected && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedRatios.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader className="mr-2 size-4" />
                Generating...
              </>
            ) : (
              `Generate ${selectedRatios.length} variation(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
