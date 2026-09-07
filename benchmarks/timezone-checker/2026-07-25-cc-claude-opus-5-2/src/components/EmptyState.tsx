import { GlobeIcon } from "./icons";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel/60 px-6 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-faint">
        <GlobeIcon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-[14px] font-medium text-ink">No cities yet</h2>
        <p className="mt-1 text-[12px] text-mute">
          Add a city to start comparing schedules. The first one becomes the reference.
        </p>
      </div>
    </div>
  );
}
