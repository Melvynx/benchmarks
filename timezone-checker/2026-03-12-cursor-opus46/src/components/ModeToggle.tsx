"use client";

import { Mode } from "@/lib/store";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
      <button
        onClick={() => onChange("meeting")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
          mode === "meeting"
            ? "bg-white text-zinc-900 shadow-sm"
            : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        Meeting
      </button>
      <button
        onClick={() => onChange("base")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
          mode === "base"
            ? "bg-white text-zinc-900 shadow-sm"
            : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        Base
      </button>
    </div>
  );
}
