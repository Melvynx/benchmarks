import type { OverlapData } from "../../hooks/useOverlapData";
import { DesktopGrid } from "./DesktopGrid";
import { MobileGrid } from "./MobileGrid";

export function Grid({ data }: { data: OverlapData }) {
  if (data.cities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-base-700/70 bg-base-850/40 py-16 text-center">
        <p className="text-base-300">No cities yet.</p>
        <p className="mt-1 text-sm text-base-500">Use "Add city" above to start comparing timezones.</p>
      </div>
    );
  }

  return (
    <>
      <DesktopGrid data={data} />
      <MobileGrid data={data} />
    </>
  );
}
