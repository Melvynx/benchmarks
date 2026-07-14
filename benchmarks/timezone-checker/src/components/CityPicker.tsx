import { useMemo, useRef, useState } from "react";
import type { City } from "../data/cities";

interface Props {
  catalog: City[];
  selectedIds: Set<string>;
  onAdd: (id: string) => void;
}

export function CityPicker({ catalog, selectedIds, onAdd }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return catalog.filter((c) => !selectedIds.has(c.id));
    return catalog.filter(
      (c) =>
        !selectedIds.has(c.id) &&
        (c.name.toLowerCase().includes(s) ||
          c.country.toLowerCase().includes(s) ||
          c.region.toLowerCase().includes(s)),
    );
  }, [catalog, q, selectedIds]);

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <input
        type="text"
        placeholder="Add city or country…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false);
        }}
        className="w-full rounded-lg border border-white/10 bg-surface-1 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        aria-expanded={open}
        aria-controls="city-suggest"
        autoComplete="off"
      />
      {open && (
        <ul
          id="city-suggest"
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-white/10 bg-surface-2 py-1 shadow-xl"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
          ) : (
            filtered.slice(0, 80).map((c) => (
              <li key={c.id} role="option">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onAdd(c.id);
                    setQ("");
                    setOpen(false);
                  }}
                >
                  <span>
                    {c.name}
                    <span className="text-slate-500"> · {c.country}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">
                    {c.region}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
