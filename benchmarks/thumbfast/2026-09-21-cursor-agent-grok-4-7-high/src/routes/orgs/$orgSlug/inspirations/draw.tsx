import { DrawingEditor } from "@/features/drawing/drawing-editor";
import {
  createEmptyDrawing,
  parseDrawingDocument,
} from "@/features/drawing/drawing.schema";
import { useInspiration } from "@/features/inspiration/inspiration.query";
import { Button } from "@/components/ui/button";
import Link from "@/compat/link";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

type DrawSearch = {
  inspirationId?: string;
};

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/draw")({
  validateSearch: (search: Record<string, unknown>): DrawSearch => ({
    inspirationId:
      typeof search.inspirationId === "string" && search.inspirationId
        ? search.inspirationId
        : undefined,
  }),
  component: DrawInspirationPage,
});

function DrawInspirationPage() {
  const { orgSlug } = Route.useParams();
  const { inspirationId } = Route.useSearch();

  if (!inspirationId) {
    return (
      <DrawingEditor
        key="new-drawing"
        orgSlug={orgSlug}
        initialDocument={createEmptyDrawing()}
        initialName="Drawing inspiration"
      />
    );
  }

  return <EditDrawingPage orgSlug={orgSlug} inspirationId={inspirationId} />;
}

function EditDrawingPage({
  orgSlug,
  inspirationId,
}: {
  orgSlug: string;
  inspirationId: string;
}) {
  const { data, isLoading } = useInspiration(orgSlug, inspirationId);
  const backHref = `/orgs/${orgSlug}/inspirations`;

  if (isLoading || !data) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-[#eceae4]">
        <h1 className="text-lg font-semibold">Grok 4.7</h1>
        <Loader2 className="size-5 animate-spin" />
        <p className="text-sm text-[#57534e]">Loading drawing...</p>
      </div>
    );
  }

  const document = parseDrawingDocument(data.drawing);
  if (!data.hasDrawing || !document) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#eceae4] px-6 text-center">
        <h1 className="text-lg font-semibold">Grok 4.7</h1>
        <p className="max-w-md text-sm text-[#57534e]">
          This inspiration does not have an editable drawing.
        </p>
        <Button asChild>
          <Link href={backHref}>Back to inspirations</Link>
        </Button>
      </div>
    );
  }

  return (
    <DrawingEditor
      key={inspirationId}
      orgSlug={orgSlug}
      inspirationId={inspirationId}
      initialDocument={document}
      initialName={data.name}
    />
  );
}
