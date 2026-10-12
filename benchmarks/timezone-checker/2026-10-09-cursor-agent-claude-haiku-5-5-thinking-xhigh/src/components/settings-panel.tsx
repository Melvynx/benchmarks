"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { AppSettings } from "@/lib/app-state";
import { countAwakeHours } from "@/lib/overlap";
import { formatClock, type TimeFormat } from "@/lib/time";
import { SegmentedControl } from "./segmented-control";
import { CARD, SELECT, WARNING } from "./styles";

interface SettingsPanelProps {
  readonly settings: AppSettings;
  readonly onChange: (patch: Partial<AppSettings>) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string }[] = [
  { value: "12h", label: "12h" },
  { value: "24h", label: "24h" },
];

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const { wakeHour, sleepHour, timeFormat } = settings;
  const isEmptyWindow = wakeHour === sleepHour;
  const awakeHours = countAwakeHours(settings);

  return (
    <section aria-label="Awake window settings" className={`${CARD} p-4 sm:p-5`}>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Wake up at" htmlFor="wake-hour">
          <HourSelect
            id="wake-hour"
            value={wakeHour}
            timeFormat={timeFormat}
            onChange={(hour) => onChange({ wakeHour: hour })}
          />
        </Field>

        <Field label="Go to sleep at" htmlFor="sleep-hour">
          <HourSelect
            id="sleep-hour"
            value={sleepHour}
            timeFormat={timeFormat}
            onChange={(hour) => onChange({ sleepHour: hour })}
          />
        </Field>

        <Field label="Time format">
          <SegmentedControl
            label="Time format"
            value={timeFormat}
            options={TIME_FORMAT_OPTIONS}
            onChange={(format) => onChange({ timeFormat: format })}
          />
        </Field>
      </div>

      <div className="mt-4">
        {isEmptyWindow ? (
          <div role="alert" className={WARNING}>
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Wake-up and sleep hours must differ. With identical hours nobody is ever awake.
            </span>
          </div>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Awake {awakeHours} {awakeHours === 1 ? "hour" : "hours"} a day, from{" "}
            {formatClock(wakeHour * 60, timeFormat)} until{" "}
            {formatClock(sleepHour * 60, timeFormat)}
            {wakeHour > sleepHour && " (overnight)"}.
          </p>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  readonly label: string;
  readonly htmlFor?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-xs font-medium text-stone-500 dark:text-stone-400">
          {label}
        </label>
      ) : (
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      )}
      {children}
    </div>
  );
}

function HourSelect({
  id,
  value,
  timeFormat,
  onChange,
}: {
  readonly id: string;
  readonly value: number;
  readonly timeFormat: TimeFormat;
  readonly onChange: (hour: number) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={SELECT}
      >
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {formatClock(hour * 60, timeFormat)}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-stone-400"
      />
    </div>
  );
}
