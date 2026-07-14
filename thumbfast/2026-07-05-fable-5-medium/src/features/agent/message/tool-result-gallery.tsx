import { Image as ImageIcon, Users } from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";

type InspirationItem = {
  id: string;
  name: string;
  aiDescription?: string;
  category?: string;
  thumbnailUrls?: string[];
};

type PersonItem = {
  id: string;
  name: string;
  description?: string;
  images?: string[];
};

type UserImageItem = {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
};

type ThumbnailItem = {
  generationId: string;
  promptId: string;
  thumbnailUrl: string | null;
  promptText: string;
  isEdit: boolean;
  createdAt: string;
};

export function ToolResultGallery({
  toolName,
  output,
  orgSlug,
}: {
  toolName: string;
  output: Record<string, unknown>;
  orgSlug: string;
}) {
  if (
    toolName === "search_inspirations" &&
    Array.isArray(output.inspirations)
  ) {
    const items = output.inspirations as InspirationItem[];
    if (items.length === 0) return null;
    return <InspirationGallery items={items} orgSlug={orgSlug} />;
  }

  if (toolName === "get_persons" && Array.isArray(output.persons)) {
    const items = output.persons as PersonItem[];
    if (items.length === 0) return null;
    return <PersonGallery items={items} orgSlug={orgSlug} />;
  }

  if (toolName === "get_user_images" && Array.isArray(output.images)) {
    const items = output.images as UserImageItem[];
    if (items.length === 0) return null;
    return <UserImageGallery items={items} />;
  }

  if (
    toolName === "get_recent_thumbnails" &&
    Array.isArray(output.thumbnails)
  ) {
    const items = output.thumbnails as ThumbnailItem[];
    if (items.length === 0) return null;
    return <RecentThumbnailGallery items={items} orgSlug={orgSlug} />;
  }

  return null;
}

function InspirationGallery({
  items,
  orgSlug,
}: {
  items: InspirationItem[];
  orgSlug: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.slice(0, 6).map((item) => (
        <Link
          key={item.id}
          href={`/orgs/${orgSlug}/inspirations/${item.id}`}
          className="group hover:ring-primary/50 overflow-hidden rounded-lg border transition-all hover:shadow-sm hover:ring-2"
        >
          <div className="bg-muted relative aspect-video">
            {item.thumbnailUrls?.[0] ? (
              <Image
                src={item.thumbnailUrls[0]}
                alt={item.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="text-muted-foreground/30 size-5" />
              </div>
            )}
            {item.category && (
              <span className="bg-secondary/80 absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] backdrop-blur-sm">
                {item.category}
              </span>
            )}
          </div>
          <div className="px-2 py-1.5">
            <p className="truncate text-xs font-medium">{item.name}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PersonGallery({
  items,
  orgSlug,
}: {
  items: PersonItem[];
  orgSlug: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.slice(0, 6).map((item) => (
        <Link
          key={item.id}
          href={`/orgs/${orgSlug}/persons/${item.id}`}
          className="group hover:ring-primary/50 overflow-hidden rounded-lg border transition-all hover:shadow-sm hover:ring-2"
        >
          <div className="bg-muted relative aspect-video">
            {item.images?.[0] ? (
              <Image
                src={item.images[0]}
                alt={item.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Users className="text-muted-foreground/30 size-5" />
              </div>
            )}
          </div>
          <div className="px-2 py-1.5">
            <p className="truncate text-xs font-medium">{item.name}</p>
            {item.description && (
              <p className="text-muted-foreground truncate text-[10px]">
                {item.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function UserImageGallery({ items }: { items: UserImageItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.slice(0, 8).map((item) => (
        <div key={item.id} className="overflow-hidden rounded-lg border">
          <div className="bg-muted relative aspect-square">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-contain p-1"
              unoptimized
            />
          </div>
          <div className="px-2 py-1">
            <p className="truncate text-[10px] font-medium">{item.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentThumbnailGallery({
  items,
  orgSlug,
}: {
  items: ThumbnailItem[];
  orgSlug: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.slice(0, 6).map((item) => (
        <Link
          key={item.generationId}
          href={`/orgs/${orgSlug}/thumbnails/${item.promptId}`}
          className="group hover:ring-primary/50 overflow-hidden rounded-lg border transition-all hover:shadow-sm hover:ring-2"
        >
          <div className="bg-muted relative aspect-video">
            {item.thumbnailUrl ? (
              <Image
                src={item.thumbnailUrl}
                alt={item.promptText}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="text-muted-foreground/30 size-5" />
              </div>
            )}
            {item.isEdit && (
              <span className="bg-secondary/80 absolute top-1 right-1 rounded px-1.5 py-0.5 text-[10px] backdrop-blur-sm">
                Edit
              </span>
            )}
          </div>
          <div className="px-2 py-1.5">
            <p className="truncate text-[10px]">{item.promptText}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
