import { Anchor, Users } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Mode } from "@/lib/overlap";
import { withViewTransition } from "@/lib/view-transition";
import { usePreferences } from "@/state/preferences";

const OPTIONS = [
  { value: "meeting", label: "Meeting", icon: <Users aria-hidden className="size-4" /> },
  { value: "base", label: "Base", icon: <Anchor aria-hidden className="size-4" /> },
] as const;

export function ModeSwitch({ referenceName }: { referenceName: string | undefined }) {
  const mode = usePreferences((state) => state.mode);
  const setMode = usePreferences((state) => state.setMode);

  const description: Record<Mode, string> = {
    meeting: "Hours when every city is awake at the same time — for group calls.",
    base: `Each city's overlap with ${referenceName ?? "the reference city"}, on its own — for 1:1s.`,
  };

  return (
    <div className="flex flex-col gap-2.5">
      <SectionLabel>Mode</SectionLabel>
      <SegmentedControl
        label="Overlap mode"
        value={mode}
        options={OPTIONS}
        onChange={(next) => withViewTransition(() => setMode(next))}
        className="w-full sm:w-auto"
      />
      <p className="max-w-[44ch] text-[13px] leading-snug text-pretty text-ink-2">{description[mode]}</p>
    </div>
  );
}
