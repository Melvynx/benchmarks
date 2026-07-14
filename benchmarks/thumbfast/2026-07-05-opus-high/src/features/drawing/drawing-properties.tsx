// A small properties panel shown only when it is useful: when something is
// selected, or when a drawing tool is active. Restrained set of controls —
// colors, stroke, opacity, and text styling — plus quick actions.

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Trash2,
} from "lucide-react";
import {
  DRAWING_PALETTE,
  type DrawingElement,
  type DrawingFontFamily,
} from "./drawing-document";
import { useDrawingStore } from "./drawing-store";

const STROKE_WIDTHS = [
  { value: 2, label: "Thin" },
  { value: 4, label: "Medium" },
  { value: 8, label: "Bold" },
];

const FONT_SIZES = [
  { value: 32, label: "S" },
  { value: 56, label: "M" },
  { value: 88, label: "L" },
  { value: 130, label: "XL" },
];

const FONT_FAMILIES: { value: DrawingFontFamily; label: string }[] = [
  { value: "hand", label: "Hand" },
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
];

const DRAWING_TOOLS = new Set([
  "rectangle",
  "ellipse",
  "arrow",
  "freedraw",
  "text",
  "placeholder",
]);

export function DrawingProperties() {
  const tool = useDrawingStore((state) => state.tool);
  const elements = useDrawingStore((state) => state.elements);
  const selectedIds = useDrawingStore((state) => state.selectedIds);
  const activeStyle = useDrawingStore((state) => state.activeStyle);
  const applyStyle = useDrawingStore((state) => state.applyStyleToSelection);
  const setActiveStyle = useDrawingStore((state) => state.setActiveStyle);
  const updateElement = useDrawingStore((state) => state.updateElement);
  const deleteSelected = useDrawingStore((state) => state.deleteSelected);
  const duplicateSelected = useDrawingStore((state) => state.duplicateSelected);
  const bringToFront = useDrawingStore((state) => state.bringToFront);
  const sendToBack = useDrawingStore((state) => state.sendToBack);

  const selected = elements.filter((element) =>
    selectedIds.includes(element.id),
  );
  const hasSelection = selected.length > 0;
  const isDrawingTool = DRAWING_TOOLS.has(tool);

  if (!hasSelection && !isDrawingTool) return null;

  const types = new Set(selected.map((element) => element.type));
  const targetTypes = hasSelection ? types : new Set([tool]);

  const showFill = targetTypes.has("rectangle") || targetTypes.has("ellipse");
  const showStroke =
    targetTypes.has("rectangle") ||
    targetTypes.has("ellipse") ||
    targetTypes.has("arrow") ||
    targetTypes.has("freedraw") ||
    targetTypes.has("placeholder") ||
    (!hasSelection && DRAWING_TOOLS.has(tool) && tool !== "text");
  const showText = targetTypes.has("text");

  const firstText = selected.find(
    (element): element is Extract<DrawingElement, { type: "text" }> =>
      element.type === "text",
  );

  const updateStyle = (patch: Parameters<typeof applyStyle>[0]) => {
    applyStyle(patch);
  };

  return (
    <div className="border-border bg-background/95 flex w-56 flex-col gap-3 rounded-xl border p-3 shadow-lg backdrop-blur">
      {showStroke ? (
        <PanelRow label={showText ? "Text color" : "Stroke"}>
          <ColorSwatches
            value={showText ? activeStyle.color : activeStyle.stroke}
            onChange={(color) =>
              updateStyle(showText ? { color } : { stroke: color })
            }
          />
        </PanelRow>
      ) : null}

      {showText ? (
        <PanelRow label="Color">
          <ColorSwatches
            value={activeStyle.color}
            onChange={(color) => updateStyle({ color })}
          />
        </PanelRow>
      ) : null}

      {showFill ? (
        <PanelRow label="Fill">
          <ColorSwatches
            value={activeStyle.fill}
            onChange={(fill) => updateStyle({ fill })}
            includeTransparent
          />
        </PanelRow>
      ) : null}

      {showStroke && !showText ? (
        <PanelRow label="Stroke width">
          <div className="flex gap-1">
            {STROKE_WIDTHS.map((option) => (
              <SegmentButton
                key={option.value}
                active={activeStyle.strokeWidth === option.value}
                onClick={() => updateStyle({ strokeWidth: option.value })}
              >
                {option.label}
              </SegmentButton>
            ))}
          </div>
        </PanelRow>
      ) : null}

      {showText ? (
        <>
          <PanelRow label="Font size">
            <div className="flex gap-1">
              {FONT_SIZES.map((option) => (
                <SegmentButton
                  key={option.value}
                  active={activeStyle.fontSize === option.value}
                  onClick={() => updateStyle({ fontSize: option.value })}
                >
                  {option.label}
                </SegmentButton>
              ))}
            </div>
          </PanelRow>
          <PanelRow label="Font">
            <div className="flex gap-1">
              {FONT_FAMILIES.map((option) => (
                <SegmentButton
                  key={option.value}
                  active={activeStyle.fontFamily === option.value}
                  onClick={() => updateStyle({ fontFamily: option.value })}
                >
                  {option.label}
                </SegmentButton>
              ))}
            </div>
          </PanelRow>
          <PanelRow label="Style">
            <div className="flex gap-1">
              <IconToggle
                active={activeStyle.fontWeight >= 700}
                onClick={() =>
                  updateStyle({
                    fontWeight: activeStyle.fontWeight >= 700 ? 400 : 800,
                  })
                }
                label="Bold"
              >
                <Bold className="size-4" />
              </IconToggle>
              <Separator orientation="vertical" className="h-8" />
              {(["left", "center", "right"] as const).map((align) => (
                <IconToggle
                  key={align}
                  active={firstText?.align === align}
                  onClick={() =>
                    firstText
                      ? updateElement(firstText.id, { align }, true)
                      : undefined
                  }
                  label={`Align ${align}`}
                  disabled={!firstText}
                >
                  {align === "left" ? (
                    <AlignLeft className="size-4" />
                  ) : align === "right" ? (
                    <AlignRight className="size-4" />
                  ) : (
                    <AlignCenter className="size-4" />
                  )}
                </IconToggle>
              ))}
            </div>
          </PanelRow>
        </>
      ) : null}

      <PanelRow label={`Opacity ${Math.round(activeStyle.opacity * 100)}%`}>
        <Slider
          min={10}
          max={100}
          step={5}
          value={[Math.round(activeStyle.opacity * 100)]}
          onValueChange={([value]) => {
            const opacity = value / 100;
            if (hasSelection) updateStyle({ opacity });
            else setActiveStyle({ opacity });
          }}
        />
      </PanelRow>

      {hasSelection ? (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-1">
            <ActionButton onClick={duplicateSelected} label="Duplicate">
              <Copy className="size-4" />
            </ActionButton>
            <ActionButton onClick={bringToFront} label="Bring to front">
              <ChevronsUp className="size-4" />
            </ActionButton>
            <ActionButton onClick={sendToBack} label="Send to back">
              <ChevronsDown className="size-4" />
            </ActionButton>
            <ActionButton onClick={deleteSelected} label="Delete" destructive>
              <Trash2 className="size-4" />
            </ActionButton>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PanelRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}

function ColorSwatches({
  value,
  onChange,
  includeTransparent,
}: {
  value: string;
  onChange: (color: string) => void;
  includeTransparent?: boolean;
}) {
  const colors = includeTransparent
    ? ["transparent", ...DRAWING_PALETTE]
    : [...DRAWING_PALETTE];
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color) => {
        const isTransparent = color === "transparent";
        const active = value === color;
        return (
          <button
            key={color}
            type="button"
            aria-label={isTransparent ? "Transparent" : color}
            onClick={() => onChange(color)}
            className={cn(
              "size-6 rounded-md border transition-transform",
              active
                ? "ring-primary ring-offset-background ring-2 ring-offset-1"
                : "hover:scale-110",
              color === "#ffffff" && "border-border",
            )}
            style={{
              background: isTransparent
                ? "repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 10px 10px"
                : color,
            }}
          />
        );
      })}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 flex-1 rounded-md border text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function IconToggle({
  active,
  onClick,
  label,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
          className={cn(
            "flex size-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40",
            active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-accent",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function ActionButton({
  onClick,
  label,
  destructive,
  children,
}: {
  onClick: () => void;
  label: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-9", destructive && "text-destructive")}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
