import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Shadow, type Canvas, type FabricObject, type Textbox } from "fabric";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Group as GroupIcon,
  SendToBack,
  BringToFront,
  ChevronsDown,
  ChevronsUp,
  Trash2,
  Underline,
  Ungroup,
} from "lucide-react";
import {
  bringForward,
  bringToFront,
  duplicateSelection,
  deleteSelection,
  groupSelection,
  sendBackward,
  sendToBack,
  ungroupSelection,
} from "./drawing-canvas-actions";

type DrawingObjectPanelProps = {
  canvas: Canvas | null;
  canvasVersion: number;
  onChange: () => void;
};

const SHAPE_TYPES = new Set(["rect", "ellipse", "circle", "polygon"]);
const TEXT_TYPES = new Set(["textbox", "i-text"]);

function isTextbox(object: FabricObject): object is Textbox {
  return TEXT_TYPES.has(object.type);
}

export function DrawingObjectPanel({
  canvas,
  canvasVersion,
  onChange,
}: DrawingObjectPanelProps) {
  if (!canvas) return null;
  // Forces a re-read of the live fabric selection on every change tick.
  void canvasVersion;

  const active = canvas.getActiveObject() ?? null;
  const activeObjects = canvas.getActiveObjects();
  const isMultiSelect = active?.type === "activeselection";
  const singleObject = !isMultiSelect ? active : null;

  const apply = (mutate: (object: FabricObject) => void) => {
    if (!singleObject) return;
    mutate(singleObject);
    singleObject.setCoords();
    canvas.requestRenderAll();
    onChange();
  };

  if (activeObjects.length === 0) {
    return (
      <p className="text-muted-foreground px-2 py-6 text-center text-xs">
        Select an object to edit its style
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-1">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => void duplicateSelection(canvas)}
            >
              <Copy className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => deleteSelection(canvas)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => bringForward(canvas, onChange)}
            >
              <BringToFront className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bring forward</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => sendBackward(canvas, onChange)}
            >
              <SendToBack className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send backward</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => bringToFront(canvas, onChange)}
            >
              <ChevronsUp className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bring to front</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              onClick={() => sendToBack(canvas, onChange)}
            >
              <ChevronsDown className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send to back</TooltipContent>
        </Tooltip>
        {isMultiSelect && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                onClick={() => groupSelection(canvas)}
              >
                <GroupIcon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Group</TooltipContent>
          </Tooltip>
        )}
        {active?.type === "group" && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8"
                onClick={() => ungroupSelection(canvas)}
              >
                <Ungroup className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ungroup</TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label className="text-xs">Opacity</Label>
        <Slider
          value={[Math.round((singleObject?.opacity ?? 1) * 100)]}
          min={0}
          max={100}
          step={1}
          disabled={!singleObject}
          onValueChange={([value]) =>
            apply((object) => object.set({ opacity: value / 100 }))
          }
        />
      </div>

      {singleObject && SHAPE_TYPES.has(singleObject.type) && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Fill</Label>
              <input
                type="color"
                className="size-7 cursor-pointer rounded border"
                value={String(singleObject.fill ?? "#000000")}
                onChange={(e) =>
                  apply((object) => object.set({ fill: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Stroke</Label>
              <input
                type="color"
                className="size-7 cursor-pointer rounded border"
                value={String(singleObject.stroke ?? "#000000")}
                onChange={(e) =>
                  apply((object) => object.set({ stroke: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Stroke width</Label>
              <Slider
                value={[singleObject.strokeWidth]}
                min={0}
                max={30}
                step={1}
                onValueChange={([value]) =>
                  apply((object) => object.set({ strokeWidth: value }))
                }
              />
            </div>
            {singleObject.type === "rect" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Corner radius</Label>
                <Slider
                  value={[(singleObject as unknown as { rx?: number }).rx ?? 0]}
                  min={0}
                  max={120}
                  step={1}
                  onValueChange={([value]) =>
                    apply((object) => object.set({ rx: value, ry: value }))
                  }
                />
              </div>
            )}
          </div>
        </>
      )}

      {singleObject && isTextbox(singleObject) && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Font size</Label>
              <Slider
                value={[singleObject.fontSize]}
                min={10}
                max={160}
                step={1}
                onValueChange={([value]) =>
                  apply((object) => object.set({ fontSize: value }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Color</Label>
              <input
                type="color"
                className="size-7 cursor-pointer rounded border"
                value={String(singleObject.fill ?? "#000000")}
                onChange={(e) =>
                  apply((object) => object.set({ fill: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-1">
              <Toggle
                size="sm"
                pressed={
                  singleObject.fontWeight === "700" ||
                  singleObject.fontWeight === 700
                }
                onPressedChange={(pressed) =>
                  apply((object) =>
                    object.set({ fontWeight: pressed ? "700" : "400" }),
                  )
                }
              >
                <Bold className="size-3.5" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={singleObject.underline}
                onPressedChange={(pressed) =>
                  apply((object) => object.set({ underline: pressed }))
                }
              >
                <Underline className="size-3.5" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={singleObject.textAlign === "left"}
                onPressedChange={() =>
                  apply((object) => object.set({ textAlign: "left" }))
                }
              >
                <AlignLeft className="size-3.5" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={singleObject.textAlign === "center"}
                onPressedChange={() =>
                  apply((object) => object.set({ textAlign: "center" }))
                }
              >
                <AlignCenter className="size-3.5" />
              </Toggle>
              <Toggle
                size="sm"
                pressed={singleObject.textAlign === "right"}
                onPressedChange={() =>
                  apply((object) => object.set({ textAlign: "right" }))
                }
              >
                <AlignRight className="size-3.5" />
              </Toggle>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Outline</Label>
              <input
                type="color"
                className="size-7 cursor-pointer rounded border"
                value={String(singleObject.stroke ?? "#000000")}
                onChange={(e) =>
                  apply((object) =>
                    object.set({
                      stroke: e.target.value,
                      strokeWidth: object.strokeWidth || 2,
                      paintFirst: "stroke",
                    }),
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Shadow</Label>
              <input
                type="color"
                className="size-7 cursor-pointer rounded border"
                value="#000000"
                onChange={(e) =>
                  apply((object) =>
                    object.set({
                      shadow: new Shadow({
                        color: e.target.value,
                        blur: 12,
                        offsetX: 4,
                        offsetY: 4,
                      }),
                    }),
                  )
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
