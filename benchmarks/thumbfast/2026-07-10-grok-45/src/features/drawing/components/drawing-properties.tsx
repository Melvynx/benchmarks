import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DrawingEditorApi } from "../use-drawing-editor";

type DrawingPropertiesProps = {
  editor: DrawingEditorApi;
};

export function DrawingProperties({ editor }: DrawingPropertiesProps) {
  const element = editor.selectedElement;
  if (!element) return null;

  return (
    <aside className="bg-card/95 absolute top-20 right-4 z-20 w-56 rounded-xl border p-3 shadow-md backdrop-blur">
      <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
        {element.type}
      </p>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Stroke</Label>
            <Input
              type="color"
              value={
                element.strokeColor === "transparent"
                  ? "#1e1e1e"
                  : element.strokeColor
              }
              onChange={(event) =>
                editor.updateSelectedStyle({ strokeColor: event.target.value })
              }
              className="h-8 p-1"
            />
          </div>
          {"fillColor" in element ? (
            <div className="space-y-1">
              <Label className="text-xs">Fill</Label>
              <Input
                type="color"
                value={
                  element.fillColor === "transparent"
                    ? "#ffffff"
                    : element.fillColor
                }
                onChange={(event) =>
                  editor.updateSelectedStyle({ fillColor: event.target.value })
                }
                className="h-8 p-1"
              />
            </div>
          ) : null}
        </div>

        {element.type !== "text" && element.type !== "image" ? (
          <div className="space-y-1">
            <Label className="text-xs">Stroke width</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={element.strokeWidth}
              onChange={(event) =>
                editor.updateSelectedStyle({
                  strokeWidth: Number(event.target.value) || 1,
                })
              }
              className="h-8"
            />
          </div>
        ) : null}

        {element.type === "text" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Font size</Label>
              <Input
                type="number"
                min={16}
                max={200}
                value={element.fontSize}
                onChange={(event) =>
                  editor.updateSelectedStyle({
                    fontSize: Number(event.target.value) || 16,
                  })
                }
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Align</Label>
              <Select
                value={element.align}
                onValueChange={(value) =>
                  editor.updateSelectedStyle({
                    align: value as "left" | "center" | "right",
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        {element.type === "person" ? (
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={element.label}
              onChange={(event) =>
                editor.updateSelectedStyle({ label: event.target.value })
              }
              className="h-8"
            />
          </div>
        ) : null}

        <div className="space-y-1">
          <Label className="text-xs">Rotation</Label>
          <Input
            type="number"
            value={Math.round(element.rotation)}
            onChange={(event) =>
              editor.updateSelectedStyle({
                rotation: Number(event.target.value) || 0,
              })
            }
            className="h-8"
          />
        </div>
      </div>
    </aside>
  );
}
