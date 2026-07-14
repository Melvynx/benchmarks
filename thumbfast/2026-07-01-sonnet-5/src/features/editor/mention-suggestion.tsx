import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ImageIcon, LinkIcon, Loader2, User } from "lucide-react";
import Image from "@/compat/image";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from "react";

export type MentionType = "person" | "inspiration" | "image";

export type SuggestionItem = {
  id: string;
  label: string;
  type: MentionType;
  imageUrl?: string;
  subtitle?: string;
  isAdded?: boolean;
  _loading?: boolean;
};

export type SuggestionListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

type SuggestionListProps = {
  items: SuggestionItem[];
  command: (item: {
    id: string;
    label: string;
    mentionType: MentionType;
  }) => void;
};

const TYPE_CONFIG = {
  person: {
    icon: User,
    label: "Person",
    color: "text-violet-400 bg-violet-500/15 border-violet-500/20",
  },
  inspiration: {
    icon: LinkIcon,
    label: "Style",
    color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20",
  },
  image: {
    icon: ImageIcon,
    label: "Image",
    color: "text-amber-400 bg-amber-500/15 border-amber-500/20",
  },
} as const;

export const SuggestionList = forwardRef<
  SuggestionListRef,
  SuggestionListProps
>(({ items, command }, ref) => {
  const [selection, setSelection] = useState({ items, index: 0 });
  const selectedIndex = selection.items === items ? selection.index : 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const selected = container.querySelector<HTMLElement>(
      "[data-selected='true']",
    );
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [items, selectedIndex]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (item) {
        command({ id: item.id, label: item.label, mentionType: item.type });
      }
    },
    [items, command],
  );

  const upHandler = useCallback(() => {
    setSelection((current) => {
      const currentIndex = current.items === items ? current.index : 0;
      return {
        items,
        index: currentIndex <= 0 ? items.length - 1 : currentIndex - 1,
      };
    });
  }, [items]);

  const downHandler = useCallback(() => {
    setSelection((current) => {
      const currentIndex = current.items === items ? current.index : 0;
      return {
        items,
        index: currentIndex >= items.length - 1 ? 0 : currentIndex + 1,
      };
    });
  }, [items]);

  const enterHandler = useCallback(() => {
    selectItem(selectedIndex);
  }, [selectItem, selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  const isLoading = items.some((item) => item._loading);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Searching...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground px-3 py-6 text-center text-sm">
        No matching persons, styles, or images
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex max-h-72 flex-col overflow-y-auto overscroll-contain py-1"
    >
      {items.map((item, index) => (
        <SuggestionRow
          key={`${item.type}-${item.id}`}
          item={item}
          isSelected={index === selectedIndex}
          onClick={() => selectItem(index)}
          dimmed={item.isAdded}
        />
      ))}
    </div>
  );
});

SuggestionList.displayName = "SuggestionList";

function SuggestionRow({
  item,
  isSelected,
  onClick,
  dimmed,
}: {
  item: SuggestionItem;
  isSelected?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  const config = TYPE_CONFIG[item.type];

  return (
    <button
      type="button"
      data-selected={isSelected ?? undefined}
      className={cn(
        "hover:bg-accent mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
        isSelected && "bg-accent",
        dimmed && "opacity-60",
      )}
      onClick={onClick}
    >
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.label}
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
          <config.icon className="text-muted-foreground size-4" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{item.label}</span>
        {item.subtitle && (
          <span className="text-muted-foreground truncate text-xs leading-tight">
            {item.subtitle}
          </span>
        )}
      </div>
      <Badge
        variant="outline"
        className={cn("shrink-0 border text-[10px]", config.color)}
      >
        {config.label}
      </Badge>
    </button>
  );
}
