import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { AdminGenerationDetailDialog } from "@/features/admin/admin-generation-detail-dialog";
import { StatusBadge } from "@/routes/admin/_components/admin-shared";
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
  Building2,
  Clock,
  Hash,
  Image as ImageIcon,
  Loader2,
  User,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

export const GENERATION_VIEWS = ["list", "grid"] as const;
export type GenerationView = (typeof GENERATION_VIEWS)[number];

export type GenerationListData = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.queries.listGenerations>>
>;
export type GenerationListItem = GenerationListData["items"][number];
export type AdminThumbnail = GenerationListItem["thumbnails"][number];

export type ThumbnailClickHandler = (
  thumbnail: AdminThumbnail,
  generation: GenerationListItem,
) => void;

export function AdminGenerationList(props: {
  generations: GenerationListItem[];
  view?: GenerationView;
}) {
  const view = props.view ?? "list";
  const generations = props.generations;
  const [selectedIds, setSelectedIds] = useState<{
    generationId: string;
    thumbnailId: string;
  } | null>(null);

  const handleThumbnailClick: ThumbnailClickHandler = (
    thumbnail,
    generation,
  ) => {
    setSelectedIds({
      generationId: generation.id,
      thumbnailId: thumbnail.id,
    });
  };

  const selectedGeneration = selectedIds
    ? (generations.find((g) => g.id === selectedIds.generationId) ?? null)
    : null;
  const selectedThumbnail =
    selectedGeneration && selectedIds
      ? (selectedGeneration.thumbnails.find(
          (t) => t.id === selectedIds.thumbnailId,
        ) ?? null)
      : null;

  return (
    <>
      {view === "grid" ? (
        <ItemGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {generations.map((generation) => (
            <GenerationGridCard
              key={generation.id}
              generation={generation}
              onThumbnailClick={handleThumbnailClick}
            />
          ))}
        </ItemGroup>
      ) : (
        <ItemGroup className="gap-3">
          {generations.map((generation) => (
            <GenerationCard
              key={generation.id}
              generation={generation}
              onThumbnailClick={handleThumbnailClick}
            />
          ))}
        </ItemGroup>
      )}

      <AdminGenerationDetailDialog
        open={selectedIds !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIds(null);
        }}
        thumbnail={selectedThumbnail}
        generation={selectedGeneration}
      />
    </>
  );
}

function getLatestThumbnail(
  generation: GenerationListItem,
): AdminThumbnail | null {
  return generation.thumbnails.at(0) ?? null;
}

export function GenerationGridCard(props: {
  generation: GenerationListItem;
  onThumbnailClick: ThumbnailClickHandler;
}) {
  const generation = props.generation;
  const latestThumbnail = getLatestThumbnail(generation);
  const imageUrl =
    latestThumbnail?.watermarkedUrl ?? latestThumbnail?.url ?? null;
  const isInFlight =
    generation.status === "pending" || generation.status === "processing";
  const modelLabel =
    getModelLabel(generation.requestedModel) ?? generation.requestedModel;
  const organizationLabel =
    generation.organization?.name ??
    generation.organization?.slug ??
    `${generation.organizationId.slice(0, 12)}...`;

  return (
    <button
      type="button"
      disabled={!latestThumbnail}
      onClick={() => {
        if (!latestThumbnail) return;
        props.onThumbnailClick(latestThumbnail, generation);
      }}
      className={cn(
        "group ring-primary/50 relative overflow-hidden rounded-2xl shadow-md transition-all hover:shadow-xl hover:ring-2 disabled:cursor-default disabled:hover:ring-0",
        getAspectRatioClass(generation.aspectRatio ?? undefined),
      )}
      aria-label={
        latestThumbnail
          ? "Open generation detail"
          : "Generation has no thumbnail yet"
      }
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="Latest generation output"
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex size-full items-center justify-center">
          {generation.status === "failed" ? (
            <XCircle className="size-10" />
          ) : isInFlight ? (
            <Loader2 className="size-10 animate-spin" />
          ) : (
            <ImageIcon className="size-10" />
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-2 bg-black/70 p-3 text-left text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <p className="line-clamp-3 text-xs leading-relaxed">
          {generation.prompt}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-white/80">
          <Building2 className="size-3 shrink-0" />
          <span className="truncate">{organizationLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge value={generation.status} />
          <Badge variant="secondary" className="text-xs">
            {modelLabel}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-white/70">
          <span>{dayjs(generation.createdAt).fromNow()}</span>
          {typeof generation.chargedCreditCost === "number" ? (
            <span>{generation.chargedCreditCost} credits</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function GenerationCard(props: {
  generation: GenerationListItem;
  onThumbnailClick: ThumbnailClickHandler;
}) {
  const generation = props.generation;
  const thumbnails = generation.thumbnails.slice(0, 4);
  const succeededRoutingEvent = generation.routingEvents.find(
    (event) => event.status === "succeeded",
  );
  const durationLabel = formatDurationMs(generation.averageDurationMs);
  const isInFlight =
    generation.status === "pending" || generation.status === "processing";

  return (
    <Item variant="outline" className="hover:bg-accent/30 items-start">
      <ItemMedia className="self-start">
        <ThumbnailStrip
          thumbnails={thumbnails}
          status={generation.status}
          aspectRatio={generation.aspectRatio}
          generation={generation}
          onThumbnailClick={props.onThumbnailClick}
        />
      </ItemMedia>

      <ItemContent className="min-w-0 gap-2">
        <ItemHeader>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={generation.status} />
            <Badge variant="outline" className="font-mono text-xs">
              {generation.requestedModel}
            </Badge>
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
            {isInFlight ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Loader2 className="size-3 animate-spin" />
                {generation.status}
              </span>
            ) : null}
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
            {dayjs(generation.createdAt).fromNow()}
          </span>
        </ItemHeader>

        <ItemTitle className="line-clamp-2 block text-sm leading-relaxed font-normal">
          {generation.prompt}
        </ItemTitle>

        <ItemDescription className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <MetaItem icon={Clock} label={durationLabel} />
          {generation.aspectRatio ? (
            <MetaItem icon={ImageIcon} label={generation.aspectRatio} />
          ) : null}
          {typeof generation.chargedCreditCost === "number" ? (
            <span>{generation.chargedCreditCost} credits</span>
          ) : null}
          {succeededRoutingEvent ? (
            <span>
              Routed via{" "}
              <span className="text-foreground font-medium">
                {succeededRoutingEvent.api}
              </span>{" "}
              ({succeededRoutingEvent.provider})
            </span>
          ) : null}
          <Link
            to="/admin/generations/logs"
            search={{ search: generation.id }}
            className="hover:text-foreground inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline"
          >
            <Hash className="size-3" />
            gen: {generation.id.slice(0, 12)}...
          </Link>
          <Link
            to="/admin/organizations/$orgId"
            params={{ orgId: generation.organizationId }}
            className="hover:text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline"
          >
            <Building2 className="size-3" />
            {generation.organization?.name ??
              generation.organization?.slug ??
              `${generation.organizationId.slice(0, 12)}...`}
          </Link>
          {generation.createdByUserId ? (
            <Link
              to="/admin/users/$userId"
              params={{ userId: generation.createdByUserId }}
              className="hover:text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <User className="size-3" />
              {generation.createdByUser?.name ||
                generation.createdByUser?.email ||
                generation.createdByUserId.slice(0, 12)}
            </Link>
          ) : null}
        </ItemDescription>

        {generation.errorMessage ? (
          <ItemFooter>
            <div className="bg-destructive/10 text-destructive border-destructive/20 flex w-full items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="line-clamp-2">{generation.errorMessage}</span>
            </div>
          </ItemFooter>
        ) : null}
      </ItemContent>
    </Item>
  );
}

function ThumbnailStrip(props: {
  thumbnails: GenerationListItem["thumbnails"];
  status: string;
  aspectRatio: string | null;
  generation: GenerationListItem;
  onThumbnailClick: ThumbnailClickHandler;
}) {
  const aspectClass = getAspectRatioClass(props.aspectRatio ?? undefined);

  if (props.thumbnails.length === 0) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex w-72 shrink-0 items-center justify-center rounded-md border",
          aspectClass,
        )}
      >
        {props.status === "failed" ? (
          <XCircle className="size-6" />
        ) : (
          <Loader2 className="size-6 animate-spin" />
        )}
      </div>
    );
  }

  const isSingle = props.thumbnails.length === 1;

  return (
    <div
      className={cn(
        "grid shrink-0 gap-1.5",
        isSingle ? "w-72" : "w-72 grid-cols-2",
      )}
    >
      {props.thumbnails.map((thumbnail) => {
        const src = thumbnail.watermarkedUrl ?? thumbnail.url;
        return (
          <button
            key={thumbnail.id}
            type="button"
            onClick={() => props.onThumbnailClick(thumbnail, props.generation)}
            className={cn(
              "bg-muted hover:ring-ring focus-visible:ring-ring/50 group relative overflow-hidden rounded-md border transition-all outline-none hover:ring-2 focus-visible:ring-2",
              aspectClass,
            )}
            aria-label="Open thumbnail detail"
          >
            {src ? (
              <img
                src={src}
                alt="Generation output"
                className={cn(
                  "size-full transition-transform group-hover:scale-105",
                  isSingle ? "object-contain" : "object-cover",
                )}
                loading="lazy"
              />
            ) : (
              <div className="text-muted-foreground flex size-full items-center justify-center">
                {thumbnail.status === "failed" ? (
                  <XCircle className="size-4" />
                ) : (
                  <Loader2 className="size-4 animate-spin" />
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MetaItem(props: { icon: LucideIcon; label: string }) {
  const Icon = props.icon;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3" />
      {props.label}
    </span>
  );
}

export function EmptyGenerations() {
  return (
    <div className="bg-card flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <ImageIcon className="text-muted-foreground size-5" />
      </div>
      <p className="text-sm font-medium">No generations found</p>
      <p className="text-muted-foreground text-xs">
        Try changing the search or status filter.
      </p>
    </div>
  );
}
