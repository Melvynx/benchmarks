import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Braces, Brackets, ChevronRight } from "lucide-react";
import { useState } from "react";

type MetadataViewProps = {
  value: string | null;
  className?: string;
};

function deepParse(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return deepParse(JSON.parse(trimmed));
      } catch {
        return value;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => deepParse(entry));
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      deepParse(val),
    ]),
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value)
  );
}

function isContainer(value: unknown): boolean {
  return isPlainObject(value) || Array.isArray(value);
}

function summarize(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    return `${keys.length} key${keys.length === 1 ? "" : "s"}`;
  }
  return "";
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/60 italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium",
          value
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {value ? "true" : "false"}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span className="text-foreground font-mono tabular-nums">{value}</span>
    );
  }
  return (
    <span className="text-foreground break-words">{String(value)}</span>
  );
}

function ContainerChip({ value }: { value: unknown }) {
  const isArray = Array.isArray(value);
  const Icon = isArray ? Brackets : Braces;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex cursor-default items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] transition-colors">
          <Icon className="size-3" />
          {summarize(value)}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        className="bg-popover text-popover-foreground border-border max-w-[420px] border p-0 shadow-lg"
        hideArrow
      >
        <pre className="max-h-[60vh] max-w-[420px] overflow-auto rounded-md p-3 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(value, null, 2)}
        </pre>
      </TooltipContent>
    </Tooltip>
  );
}

function MetadataRow({
  label,
  value,
  depth,
}: {
  label: string;
  value: unknown;
  depth: number;
}) {
  const [open, setOpen] = useState(depth === 0);
  const container = isContainer(value);

  if (!container) {
    return (
      <div className="hover:bg-muted/40 flex items-start justify-between gap-3 px-3 py-1.5 transition-colors">
        <span className="text-muted-foreground min-w-0 font-mono text-xs break-words">
          {label}
        </span>
        <span className="min-w-0 text-right text-xs">
          <PrimitiveValue value={value} />
        </span>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((entry, index) => [String(index), entry] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div>
      <div className="hover:bg-muted/40 flex items-center justify-between gap-3 px-3 py-1.5 transition-colors">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1 font-mono text-xs"
        >
          <ChevronRight
            className={cn(
              "size-3 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="break-words">{label}</span>
        </button>
        <ContainerChip value={value} />
      </div>
      {open ? (
        <div className="border-border/60 ml-[1.1rem] border-l">
          {entries.length === 0 ? (
            <div className="text-muted-foreground/60 px-3 py-1.5 text-xs italic">
              empty
            </div>
          ) : (
            entries.map(([key, entry]) => (
              <MetadataRow
                key={key}
                label={key}
                value={entry}
                depth={depth + 1}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MetadataView({ value, className }: MetadataViewProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (!value) {
    return (
      <p className="text-muted-foreground mt-1 text-sm">Not set</p>
    );
  }

  let parsed: unknown;
  try {
    parsed = deepParse(JSON.parse(value));
  } catch {
    return (
      <pre className="bg-muted/30 mt-1 max-h-32 overflow-auto rounded-md border p-2 font-mono text-xs break-words whitespace-pre-wrap">
        {value}
      </pre>
    );
  }

  if (!isContainer(parsed)) {
    return (
      <p className="text-foreground mt-1 text-sm break-words">
        <PrimitiveValue value={parsed} />
      </p>
    );
  }

  const entries = Array.isArray(parsed)
    ? parsed.map((entry, index) => [String(index), entry] as const)
    : Object.entries(parsed as Record<string, unknown>);

  return (
    <div className={cn("mt-1", className)}>
      <div className="border-border bg-card divide-border/60 divide-y overflow-hidden rounded-md border">
        {entries.length === 0 ? (
          <div className="text-muted-foreground/60 px-3 py-2 text-xs italic">
            empty
          </div>
        ) : showRaw ? (
          <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        ) : (
          entries.map(([key, entry]) => (
            <MetadataRow key={key} label={key} value={entry} depth={0} />
          ))
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground mt-1 h-6 px-1 text-[11px]"
        onClick={() => setShowRaw((prev) => !prev)}
      >
        {showRaw ? "Tree view" : "Raw JSON"}
      </Button>
    </div>
  );
}
