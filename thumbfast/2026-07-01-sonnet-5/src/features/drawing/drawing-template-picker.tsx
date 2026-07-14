import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutTemplate, PenLine } from "lucide-react";
import { DRAWING_TEMPLATES } from "./drawing-templates";

type DrawingTemplatePickerProps = {
  onSelectTemplate: (templateId: string) => void;
  onSelectBlank: () => void;
};

export function DrawingTemplatePicker({
  onSelectTemplate,
  onSelectBlank,
}: DrawingTemplatePickerProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 overflow-y-auto p-6">
      <div>
        <h2 className="text-lg font-semibold">Start your drawing</h2>
        <p className="text-muted-foreground text-sm">
          Start from a blank canvas or a built-in composition template you can
          fully customize.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button type="button" onClick={onSelectBlank} className="text-left">
          <Card className="hover:border-primary h-full cursor-pointer gap-2 py-4 transition-colors">
            <CardHeader className="gap-1 px-4">
              <PenLine className="text-muted-foreground size-5" />
              <CardTitle className="text-sm">Blank canvas</CardTitle>
              <CardDescription className="text-xs">
                Start from an empty 16:9 frame
              </CardDescription>
            </CardHeader>
          </Card>
        </button>
        {DRAWING_TEMPLATES.map((template) => (
          <button
            type="button"
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className="text-left"
          >
            <Card className="hover:border-primary h-full cursor-pointer gap-2 py-4 transition-colors">
              <CardHeader className="gap-1 px-4">
                <LayoutTemplate className="text-muted-foreground size-5" />
                <CardTitle className="text-sm">{template.name}</CardTitle>
                <CardDescription className="text-xs">
                  {template.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
