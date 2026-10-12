import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES } from "../lib/cities";

export function CityPicker({ selected, onAdd }: { selected: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CITIES.filter(
      (c) =>
        !selected.includes(c.id) &&
        (!q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)),
    );
  }, [query, selected]);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (id: string) => {
    onAdd(id);
    setQuery("");
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      pick(results[active].id);
    }
  };

  return (
    <div className="picker" ref={root}>
      <button type="button" className="btn primary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        + Add city
      </button>
      {open && (
        <div className="popover" onKeyDown={onKey}>
          <input
            ref={input}
            className="search"
            placeholder="Search city or country…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search cities"
          />
          <ul className="options" role="listbox">
            {results.length === 0 && <li className="no-results">No matching cities</li>}
            {results.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === active}
                className={i === active ? "option active" : "option"}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c.id)}
              >
                <span>{c.name}</span>
                <span className="muted">{c.country}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
