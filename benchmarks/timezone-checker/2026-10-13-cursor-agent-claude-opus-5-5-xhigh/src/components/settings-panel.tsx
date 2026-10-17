import { ArrowRight, Moon, Sunrise } from "lucide-react";
import { HourSelect } from "@/components/ui/hour-select";
import { SectionLabel } from "@/components/ui/section-label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/cn";
import { formatHour, formatHours, type TimeFormat } from "@/lib/format";
import { awakeDuration, HOURS, isAwake } from "@/lib/overlap";
import { usePreferences } from "@/state/preferences";

const FORMAT_OPTIONS = [
  { value: "12h", label: "12h" },
  { value: "24h", label: "24h" },
] as const;

export function AwakeWindowSettings() {
  const wakeHour = usePreferences((state) => state.wakeHour);
  const sleepHour = usePreferences((state) => state.sleepHour);
  const timeFormat = usePreferences((state) => state.timeFormat);
  const setWakeHour = usePreferences((state) => state.setWakeHour);
  const setSleepHour = usePreferences((state) => state.setSleepHour);

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <SectionLabel>Awake window</SectionLabel>
      <div className="flex items-end gap-2">
        <HourSelect
          label="Wake up"
          icon={<Sunrise aria-hidden className="size-3.5" />}
          value={wakeHour}
          format={timeFormat}
          onChange={setWakeHour}
        />
        <ArrowRight aria-hidden className="mb-3 size-4 shrink-0 text-ink-3" />
        <HourSelect
          label="Sleep"
          icon={<Moon aria-hidden className="size-3.5" />}
          value={sleepHour}
          format={timeFormat}
          onChange={setSleepHour}
        />
      </div>
      <AwakePreview wakeHour={wakeHour} sleepHour={sleepHour} format={timeFormat} />
    </div>
  );
}

function AwakePreview({ wakeHour, sleepHour, format }: { wakeHour: number; sleepHour: number; format: TimeFormat }) {
  const duration = awakeDuration(wakeHour, sleepHour);
  const note = wakeHour === sleepHour ? "around the clock" : wakeHour > sleepHour ? "overnight" : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 gap-px overflow-hidden rounded-full" aria-hidden>
        {HOURS.map((hour) => (
          <span
            key={hour}
            className={cn(
              "flex-1 transition-colors duration-200",
              isAwake(hour * 60, wakeHour, sleepHour) ? "bg-ink/75" : "bg-sleep",
            )}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-ink-3 tabular" aria-hidden>
        {[0, 6, 12, 18].map((hour) => (
          <span key={hour}>{formatHour(hour, format)}</span>
        ))}
        <span>{formatHour(24, format)}</span>
      </div>
      <p className="text-xs text-ink-3">
        <span className="font-medium text-ink-2">{formatHours(duration)} awake</span>
        {note && <span> · {note}</span>}
        <span> · same window for every city</span>
      </p>
    </div>
  );
}

export function TimeFormatSettings() {
  const timeFormat = usePreferences((state) => state.timeFormat);
  const setTimeFormat = usePreferences((state) => state.setTimeFormat);
  return (
    <div className="flex flex-col gap-2.5">
      <SectionLabel>Clock</SectionLabel>
      <SegmentedControl
        label="Time format"
        value={timeFormat}
        options={FORMAT_OPTIONS}
        onChange={setTimeFormat}
        className="w-full sm:w-auto"
      />
    </div>
  );
}
