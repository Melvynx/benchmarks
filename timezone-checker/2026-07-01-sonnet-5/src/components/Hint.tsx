import type { Mode } from "../lib/types";

export function Hint({ mode }: { mode: Mode }) {
  const text =
    mode === "meeting"
      ? "Green cells = everyone awake"
      : "Green cells = overlap with the reference city";

  return (
    <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-base-500">
      <span className="inline-block h-2 w-2 rounded-full bg-overlap-500" />
      {text}
    </p>
  );
}
