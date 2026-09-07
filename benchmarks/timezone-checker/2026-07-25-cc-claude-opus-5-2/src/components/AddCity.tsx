import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { REGION_ORDER, searchCities, type City, type Region } from "../data/cities";
import { useDismiss } from "../hooks/useDismiss";
import { cx } from "../lib/cx";
import { formatUtcOffset, getUtcOffsetMinutes } from "../lib/time";
import { PlusIcon, SearchIcon } from "./icons";

type Props = {
  selectedIds: readonly string[];
  now: Date;
  onAdd: (cityId: string) => void;
};

/**
 * Searchable city picker. Browsing with an empty query groups by region;
 * typing switches to a flat, relevance-ranked list.
 */
export function AddCity({ selectedIds, now, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listbox = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);
  useDismiss(container, open, close);

  const results = useMemo(
    () => searchCities(query, selectedIds),
    [query, selectedIds],
  );
  const grouped = query.trim() === "";

  useEffect(() => {
    setActiveIndex(0);
  }, [query, selectedIds]);

  useLayoutEffect(() => {
    if (!open) return;
    listbox.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, query]);

  const select = (city: City | undefined) => {
    if (!city) return;
    onAdd(city.id);
    setQuery("");
    input.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(results[activeIndex]);
    }
  };

  const sections = useMemo(() => {
    if (!grouped) return null;
    return REGION_ORDER.map((region) => ({
      region,
      cities: results.filter((city) => city.region === region),
    })).filter((section) => section.cities.length > 0);
  }, [grouped, results]);

  const optionId = (index: number) => `city-option-${index}`;

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          window.setTimeout(() => input.current?.focus(), 0);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cx(
          "flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-colors",
          open
            ? "bg-overlap/20 text-overlap ring-1 ring-overlap/40"
            : "bg-overlap/12 text-overlap ring-1 ring-overlap/25 hover:bg-overlap/20",
        )}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add city
      </button>

      {open && (
        <div className="animate-rise absolute top-full right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-panel-soft shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
            <input
              ref={input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search city or country…"
              role="combobox"
              aria-expanded="true"
              aria-controls="city-listbox"
              aria-autocomplete="list"
              aria-activedescendant={results.length > 0 ? optionId(activeIndex) : undefined}
              className="w-full bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
            />
          </div>

          <div
            ref={listbox}
            id="city-listbox"
            role="listbox"
            aria-label="Cities"
            className="scroll-quiet max-h-[19rem] overflow-y-auto p-1.5"
          >
            {results.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-[12px] text-mute">
                {query.trim()
                  ? `No city matches “${query.trim()}”.`
                  : "Every city in the catalog is already on the board."}
              </p>
            ) : sections ? (
              sections.map((section) => (
                <RegionSection
                  key={section.region}
                  region={section.region}
                  cities={section.cities}
                  results={results}
                  activeIndex={activeIndex}
                  now={now}
                  optionId={optionId}
                  onHover={setActiveIndex}
                  onSelect={select}
                />
              ))
            ) : (
              results.map((city, index) => (
                <Option
                  key={city.id}
                  id={optionId(index)}
                  city={city}
                  active={index === activeIndex}
                  now={now}
                  onHover={() => setActiveIndex(index)}
                  onSelect={() => select(city)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RegionSection({
  region,
  cities,
  results,
  activeIndex,
  now,
  optionId,
  onHover,
  onSelect,
}: {
  region: Region;
  cities: City[];
  results: City[];
  activeIndex: number;
  now: Date;
  optionId: (index: number) => string;
  onHover: (index: number) => void;
  onSelect: (city: City) => void;
}) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="px-2.5 pt-2 pb-1 text-[9.5px] font-semibold tracking-[0.1em] text-faint uppercase">
        {region}
      </div>
      {cities.map((city) => {
        const index = results.indexOf(city);
        return (
          <Option
            key={city.id}
            id={optionId(index)}
            city={city}
            active={index === activeIndex}
            now={now}
            onHover={() => onHover(index)}
            onSelect={() => onSelect(city)}
          />
        );
      })}
    </div>
  );
}

function Option({
  id,
  city,
  active,
  now,
  onHover,
  onSelect,
}: {
  id: string;
  city: City;
  active: boolean;
  now: Date;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      data-active={active}
      onMouseMove={onHover}
      onClick={onSelect}
      className={cx(
        "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
        active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-ink">{city.name}</span>
        <span className="block truncate text-[10.5px] text-faint">{city.country}</span>
      </span>
      <span className="tnum shrink-0 text-[10.5px] text-mute">
        {formatUtcOffset(getUtcOffsetMinutes(city.zone, now))}
      </span>
    </button>
  );
}
