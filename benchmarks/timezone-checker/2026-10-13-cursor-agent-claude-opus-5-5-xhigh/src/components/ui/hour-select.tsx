import { ChevronDown } from "lucide-react";
import { type ReactNode, useId } from "react";
import { formatHour, type TimeFormat } from "@/lib/format";
import { HOURS } from "@/lib/overlap";

interface HourSelectProps {
  label: string;
  icon: ReactNode;
  value: number;
  format: TimeFormat;
  onChange: (hour: number) => void;
}

export function HourSelect({ label, icon, value, format, onChange }: HourSelectProps) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="tabular h-10 w-full cursor-pointer appearance-none rounded-xl bg-surface pr-9 pl-3 font-mono text-sm text-ink ring-1 ring-line-strong transition-shadow ring-inset hover:ring-ink-3"
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {formatHour(hour, format)}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3"
        />
      </div>
    </div>
  );
}
