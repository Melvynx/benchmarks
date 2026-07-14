import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import type { PersonImageQuality } from "@/lib/ai/gemini";
import { cn } from "@/lib/utils";
import { CheckCircle2, TriangleAlert } from "lucide-react";

type QualityCheck = {
  label: string;
  pass: boolean;
  feedback: string;
};

function buildChecks(quality: PersonImageQuality): QualityCheck[] {
  return [
    {
      label: "Looking at the camera, full face visible",
      pass: quality.facingCamera,
      feedback: quality.facingCameraFeedback,
    },
    {
      label: "Well framed (centered, not cropped)",
      pass: quality.wellFramed,
      feedback: quality.wellFramedFeedback,
    },
    {
      label: "Even, monotone lighting (not too bright)",
      pass: quality.evenLighting,
      feedback: quality.evenLightingFeedback,
    },
    {
      label: "Neutral expression or slight smile",
      pass: quality.naturalExpression,
      feedback: quality.naturalExpressionFeedback,
    },
  ];
}

function CheckRow({ check }: { check: QualityCheck }) {
  const Icon = check.pass ? CheckCircle2 : TriangleAlert;
  return (
    <div className="flex items-start gap-3">
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          check.pass ? "text-success" : "text-amber-500",
        )}
      />
      <div className="flex flex-col">
        <p className="text-sm font-medium">{check.label}</p>
        {check.feedback ? (
          <p className="text-muted-foreground text-sm">{check.feedback}</p>
        ) : null}
      </div>
    </div>
  );
}

function PersonQualityDialogBody({
  quality,
  onConfirm,
  onReplace,
}: {
  quality: PersonImageQuality;
  onConfirm: () => void;
  onReplace: () => void;
}) {
  const checks = buildChecks(quality);
  const allPass = quality.isPerson && checks.every((check) => check.pass);

  const handleConfirm = () => {
    dialogManager.closeAll();
    onConfirm();
  };

  const handleReplace = () => {
    dialogManager.closeAll();
    onReplace();
  };

  return (
    <div className="flex flex-col gap-4">
      {!quality.isPerson ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>No clear face detected</AlertTitle>
          <AlertDescription>
            This photo does not seem to show a clearly visible face. Upload a
            photo with one front-facing person.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant={allPass ? "success" : "default"}>
          {allPass ? <CheckCircle2 /> : <TriangleAlert />}
          <AlertTitle>
            {allPass
              ? "This photo looks great"
              : "This photo may work less well"}
          </AlertTitle>
          <AlertDescription>
            {allPass
              ? "All parameters are correct for AI thumbnail generation."
              : "Some parameters are not ideal. You can still use it, or replace it for better results."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {checks.map((check) => (
          <CheckRow key={check.label} check={check} />
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={handleReplace}>
          Replace photo
        </Button>
        <Button onClick={handleConfirm}>Use this photo</Button>
      </div>
    </div>
  );
}

/**
 * Shows the post-upload quality-check dialog asking "Are the parameters
 * correct?". Calls `onConfirm` when the user keeps the photo, or `onReplace`
 * when they want to upload a different one.
 */
export function showPersonImageQualityDialog(params: {
  quality: PersonImageQuality;
  onConfirm: () => void;
  onReplace: () => void;
}) {
  dialogManager.custom({
    title: "Are the parameters correct?",
    description:
      "We checked your photo against the criteria that work best for AI thumbnails.",
    size: "md",
    children: (
      <PersonQualityDialogBody
        quality={params.quality}
        onConfirm={params.onConfirm}
        onReplace={params.onReplace}
      />
    ),
  });
}
