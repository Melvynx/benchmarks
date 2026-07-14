import { Button } from "@/components/ui/button";
import { DrawingEditor } from "@/features/inspiration/drawing/drawing-editor";
import {
  createBlankDrawingDocument,
  parseDrawingDocument,
} from "@/features/inspiration/drawing/drawing-document";
import { InspirationDialog } from "@/features/inspiration/inspiration-dialog";
import { useDrawingInspiration } from "@/features/inspiration/inspiration.query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useState } from "react";

type NewInspirationSearch = {
  mode?: "drawing";
  inspirationId?: string;
};

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/new")({
  validateSearch: (search: Record<string, unknown>): NewInspirationSearch => ({
    mode: search.mode === "drawing" ? "drawing" : undefined,
    inspirationId:
      typeof search.inspirationId === "string"
        ? search.inspirationId
        : undefined,
  }),
  component: NewInspirationRoute,
});

function NewInspirationRoute() {
  const { orgSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/orgs/$orgSlug/inspirations/new" });
  const [open, setOpen] = useState(true);

  if (search.mode === "drawing") {
    return (
      <DrawingInspirationRoute
        orgSlug={orgSlug}
        inspirationId={search.inspirationId}
      />
    );
  }

  const closeToList = () => {
    setOpen(false);
    void navigate({ to: `/orgs/${orgSlug}/inspirations` });
  };

  return (
    <InspirationDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeToList();
        setOpen(nextOpen);
      }}
      onSuccess={(inspirationId) => {
        void navigate({
          to: `/orgs/${orgSlug}/inspirations/${inspirationId}`,
        });
      }}
    />
  );
}

function DrawingInspirationRoute({
  orgSlug,
  inspirationId,
}: {
  orgSlug: string;
  inspirationId?: string;
}) {
  const navigate = useNavigate({ from: "/orgs/$orgSlug/inspirations/new" });
  const { data, isLoading } = useDrawingInspiration(
    orgSlug,
    inspirationId ?? "",
  );
  const parsedDocument = useMemo(() => {
    if (!data) return null;
    try {
      return { document: parseDrawingDocument(data.drawingMetadata) };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "The drawing data could not be read",
      };
    }
  }, [data]);

  const navigateBack = () => {
    void navigate({
      to: inspirationId
        ? `/orgs/${orgSlug}/inspirations/${inspirationId}`
        : `/orgs/${orgSlug}/inspirations`,
    });
  };

  if (inspirationId && isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex items-center gap-2 text-sm"
        >
          <Loader2 className="size-4 animate-spin" />
          Loading drawing
        </div>
      </div>
    );
  }

  if (inspirationId && (!parsedDocument || "error" in parsedDocument)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-100 p-6 dark:bg-neutral-950">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <AlertTriangle className="text-destructive size-8" />
          <div>
            <h1 className="font-semibold">This drawing can’t be opened</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {parsedDocument && "error" in parsedDocument
                ? parsedDocument.error
                : "The editable drawing data is unavailable."}
            </p>
          </div>
          <Button onClick={navigateBack}>Back to inspiration</Button>
        </div>
      </div>
    );
  }

  return (
    <DrawingEditor
      key={inspirationId ?? "new"}
      orgSlug={orgSlug}
      inspirationId={inspirationId}
      initialName={data?.name}
      initialDocument={
        parsedDocument &&
        "document" in parsedDocument &&
        parsedDocument.document
          ? parsedDocument.document
          : createBlankDrawingDocument()
      }
      onCancel={navigateBack}
      onSaved={(savedInspirationId) => {
        void navigate({
          to: `/orgs/${orgSlug}/inspirations/${savedInspirationId}`,
        });
      }}
    />
  );
}
