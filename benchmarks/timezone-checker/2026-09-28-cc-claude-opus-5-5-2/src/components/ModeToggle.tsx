import { Anchor, Users } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Mode } from "@/lib/schedule";
import { usePlanner } from "@/state/store";

const OPTIONS = [
  { value: "meeting", label: "Meeting", icon: <Users aria-hidden className="size-4" /> },
  { value: "base", label: "Base", icon: <Anchor aria-hidden className="size-4" /> },
] as const;

export function ModeToggle({ referenceName }: { referenceName: string | undefined }) {
  const mode = usePlanner((state) => state.mode);
  const setMode = usePlanner((state) => state.setMode);

  return (
    <div className="flex flex-col gap-1.5 sm:items-end">
      <SegmentedControl<Mode> label="Comparison mode" value={mode} options={OPTIONS} onChange={setMode} />
      <p className="text-xs text-ink-2">
        {mode === "meeting"
          ? "Hours when every city is awake at once"
          : `Each city compared with ${referenceName ?? "the reference city"} on its own`}
      </p>
    </div>
  );
}
