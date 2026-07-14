import {
  BorderedDialogContent,
  BorderedDialogFooter,
  DialogEscClose,
} from "@/components/bordered-dialog";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getAspectRatioClass } from "@/lib/ai/aspect-ratio";
import { getModelLabel } from "@/lib/ai/image-models";
import { dayjs } from "@/lib/dayjs";
import { formatDurationMs } from "@/lib/format/duration";
import { cn } from "@/lib/utils";
import type { api } from "@convex/_generated/api";
import Image from "@/compat/image";
import { Link } from "@tanstack/react-router";
import type { useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Hash,
  Loader2,
  User,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/routes/admin/_components/admin-shared";

const ROUTING_EVENT_ICON: Record<string, LucideIcon> = {
  succeeded: CheckCircle2,
  failed: XCircle,
  pending: Loader2,
  processing: Loader2,
};

type AdminGeneration = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.queries.listGenerations>>
>["items"][number];
type AdminThumbnail = AdminGeneration["thumbnails"][number];
type AdminRoutingEvent = AdminGeneration["routingEvents"][number];

type AdminGenerationDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thumbnail: AdminThumbnail | null;
  generation: AdminGeneration | null;
};

export function AdminGenerationDetailDialog({
  open,
  onOpenChange,
  thumbnail,
  generation,
}: AdminGenerationDetailDialogProps) {
  const [selectedThumbnailSelection, setSelectedThumbnailSelection] = useState<{
    generationId: string;
    thumbnailId: string | null;
  } | null>(null);

  if (!generation) return null;

  const initialThumbnailId =
    thumbnail?.id ?? generation.thumbnails.at(0)?.id ?? null;
  const selectedThumbnailId =
    selectedThumbnailSelection?.generationId === generation.id
      ? selectedThumbnailSelection.thumbnailId
      : initialThumbnailId;

  const selectedThumbnail =
    generation.thumbnails.find((item) => item.id === selectedThumbnailId) ??
    generation.thumbnails.at(0) ??
    thumbnail;

  const succeededEvent = generation.routingEvents.find(
    (event) => event.status === "succeeded",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BorderedDialogContent maxWidth="sm:max-w-[96vw]">
        <DialogHeader className="sr-only">
          <DialogTitle>Generation detail</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row">
          <div className="flex flex-1 items-start justify-center overflow-y-auto bg-neutral-100 p-4 md:max-h-[82vh] md:min-h-[78vh] md:basis-[70%] dark:bg-neutral-950">
            <GenerationThumbnailGrid
              thumbnails={generation.thumbnails}
              aspectRatio={generation.aspectRatio}
              selectedThumbnailId={selectedThumbnail?.id ?? null}
              onSelect={(thumbnailId) => {
                setSelectedThumbnailSelection({
                  generationId: generation.id,
                  thumbnailId,
                });
              }}
            />
          </div>

          <div className="flex w-full flex-col gap-4 overflow-y-auto p-5 md:max-h-[82vh] md:w-[420px]">
            <section className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={generation.status} />
                {generation.fallbackUsed ? (
                  <Badge variant="secondary" className="text-xs">
                    Fallback used
                  </Badge>
                ) : null}
                {generation.routingForceOfficialFirst ? (
                  <Badge variant="outline" className="text-xs">
                    Official first
                  </Badge>
                ) : null}
              </div>
              <div className="text-muted-foreground text-xs">
                {dayjs(generation.createdAt).format("MMM D, YYYY · HH:mm:ss")}
              </div>
            </section>

            <Separator />

            <section className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Prompt
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {generation.prompt}
              </p>
            </section>

            <Separator />

            <section className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <DetailRow
                label="Requested"
                value={
                  getModelLabel(generation.requestedModel) ??
                  generation.requestedModel
                }
              />
              <DetailRow
                label="Final"
                value={
                  succeededEvent
                    ? (getModelLabel(succeededEvent.model) ??
                      succeededEvent.model)
                    : "-"
                }
              />
              <DetailRow label="Aspect" value={generation.aspectRatio ?? "-"} />
              <DetailRow
                label="Credits"
                value={
                  typeof generation.chargedCreditCost === "number"
                    ? `${generation.chargedCreditCost}`
                    : "-"
                }
              />
              <DetailRow
                label="Duration"
                value={formatDurationMs(generation.averageDurationMs)}
              />
              <DetailRow
                label="Routing default"
                value={
                  getModelLabel(generation.routingDefaultModel) ??
                  generation.routingDefaultModel
                }
              />
            </section>

            {generation.errorMessage ? (
              <div className="bg-destructive/10 text-destructive border-destructive/20 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{generation.errorMessage}</span>
              </div>
            ) : null}

            <Separator />

            <section className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Generation flow
              </h3>
              {generation.routingEvents.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">
                  No routing events recorded.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {generation.routingEvents
                    .slice()
                    .sort((a, b) => a.attemptIndex - b.attemptIndex)
                    .map((event) => (
                      <RoutingEventCard key={event.id} event={event} />
                    ))}
                </ol>
              )}
            </section>

            <Separator />

            <section className="flex flex-col gap-1 text-xs">
              <DetailRow
                label="Generation"
                value={
                  <Link
                    to="/admin/generations/logs"
                    search={{ search: generation.id }}
                    className="inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline"
                  >
                    <Hash className="size-3" />
                    {generation.id}
                  </Link>
                }
              />
              <DetailRow
                label="Org"
                value={
                  <Link
                    to="/admin/organizations/$orgId"
                    params={{ orgId: generation.organizationId }}
                    className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                  >
                    <Building2 className="size-3" />
                    {generation.organization?.name ??
                      generation.organization?.slug ??
                      generation.organizationId}
                  </Link>
                }
              />
              {generation.createdByUserId ? (
                <DetailRow
                  label="User"
                  value={
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: generation.createdByUserId }}
                      className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      <User className="size-3" />
                      {generation.createdByUser?.name ||
                        generation.createdByUser?.email ||
                        generation.createdByUserId}
                    </Link>
                  }
                />
              ) : null}
              {generation.promptId ? (
                <DetailRow
                  label="Prompt ID"
                  value={
                    <span className="font-mono">{generation.promptId}</span>
                  }
                />
              ) : null}
              {selectedThumbnail ? (
                <DetailRow
                  label="Thumbnail ID"
                  value={
                    <span className="font-mono">{selectedThumbnail.id}</span>
                  }
                />
              ) : null}
              {generation.completedAt ? (
                <DetailRow
                  label="Completed"
                  value={dayjs(generation.completedAt).fromNow()}
                />
              ) : null}
            </section>
          </div>
        </div>

        <BorderedDialogFooter>
          <DialogEscClose />
          <div className="flex items-center gap-3 text-[11px]">
            <span>
              {generation.thumbnails.length} output
              {generation.thumbnails.length === 1 ? "" : "s"}
            </span>
            <span>·</span>
            <span>{generation.routingEvents.length} routing attempt(s)</span>
          </div>
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}

function GenerationThumbnailGrid(props: {
  thumbnails: AdminThumbnail[];
  aspectRatio: string | null;
  selectedThumbnailId: string | null;
  onSelect: (thumbnailId: string) => void;
}) {
  const aspectClass = getAspectRatioClass(props.aspectRatio ?? undefined);

  if (props.thumbnails.length === 0) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex w-full max-w-md items-center justify-center rounded-2xl border",
          aspectClass,
        )}
      >
        <Loader2 className="size-10 animate-spin" />
      </div>
    );
  }

  const gridClass =
    props.thumbnails.length === 1
      ? "mx-auto w-full max-w-3xl grid-cols-1"
      : props.thumbnails.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-2";

  return (
    <div className={cn("grid w-full gap-3", gridClass)}>
      {props.thumbnails.map((thumbnail, index) => {
        const src = thumbnail.watermarkedUrl ?? thumbnail.url;
        const isSelected = thumbnail.id === props.selectedThumbnailId;

        return (
          <button
            key={thumbnail.id}
            type="button"
            onClick={() => props.onSelect(thumbnail.id)}
            className={cn(
              "group relative overflow-hidden rounded-2xl shadow-md transition-all",
              aspectClass,
              isSelected
                ? "ring-primary ring-2 ring-offset-2 ring-offset-neutral-100 dark:ring-offset-neutral-950"
                : "hover:ring-primary/40 hover:ring-2",
            )}
            aria-label={`View output ${index + 1}`}
            aria-pressed={isSelected}
          >
            {src ? (
              <Image
                src={src}
                alt={`Generation output ${index + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="bg-muted text-muted-foreground flex size-full items-center justify-center">
                {thumbnail.status === "failed" ? (
                  <XCircle className="size-8" />
                ) : (
                  <Loader2 className="size-8 animate-spin" />
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DetailRow(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
        {props.label}
      </span>
      <span className="text-foreground min-w-0 text-xs break-words">
        {props.value}
      </span>
    </div>
  );
}

function RoutingEventCard(props: { event: AdminRoutingEvent }) {
  const { event } = props;
  const isSucceeded = event.status === "succeeded";
  const isFailed = event.status === "failed";
  const Icon = ROUTING_EVENT_ICON[event.status] ?? Clock;

  return (
    <li
      className={cn(
        "rounded-md border p-2 text-xs",
        isSucceeded && "border-emerald-500/30 bg-emerald-500/5",
        isFailed && "border-destructive/30 bg-destructive/5",
        !isSucceeded && !isFailed && "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            isSucceeded && "text-emerald-600",
            isFailed && "text-destructive",
            !isSucceeded && !isFailed && "text-muted-foreground",
            event.status === "processing" && "animate-spin",
          )}
        />
        <span className="text-muted-foreground font-mono text-[10px]">
          #{event.attemptIndex}
        </span>
        <span className="font-medium">
          {getModelLabel(event.model) ?? event.model}
        </span>
        {event.fallbackUsed ? (
          <Badge variant="secondary" className="h-4 px-1 text-[9px]">
            fallback
          </Badge>
        ) : null}
        {typeof event.durationMs === "number" ? (
          <span className="text-muted-foreground ml-auto text-[10px]">
            {formatDurationMs(event.durationMs)}
          </span>
        ) : null}
      </div>
      <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
        <span>{event.provider}</span>
        <ArrowRight className="size-2.5" />
        <span>{event.api}</span>
        {event.apiModelId ? (
          <>
            <ArrowRight className="size-2.5" />
            <span className="font-mono">{event.apiModelId}</span>
          </>
        ) : null}
      </div>
      {event.error ? (
        <div className="text-destructive mt-1 line-clamp-3 text-[10px]">
          {event.error}
        </div>
      ) : null}
    </li>
  );
}
