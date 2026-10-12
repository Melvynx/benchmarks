import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CITIES } from "../lib/cities";

export function AddCity({ selected, onAdd }: { selected: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CITIES.filter(
      (c) => !selected.includes(c.id) && (!q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)),
    );
  }, [query, selected]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const pick = (id: string) => {
    onAdd(id);
    close();
  };

  return (
    <div className="add-city" ref={root}>
      <button className="btn primary" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>+</span> Add city
      </button>
      {open && (
        <div className="popover">
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            placeholder="Search city or country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                pick(results[active].id);
              } else if (e.key === "Escape") {
                close();
              }
            }}
          />
          <ul id={listId} role="listbox">
            {results.map((c, i) => (
              <li
                key={c.id}
                id={`${listId}-${c.id}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "active" : ""}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c.id)}
              >
                <span>{c.name}</span>
                <small>{c.country}</small>
              </li>
            ))}
            {results.length === 0 && <li className="none">No cities found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
