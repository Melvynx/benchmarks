import { Check, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNow } from '../../hooks/use-now';
import { CITIES, type City, REGIONS } from '../../lib/cities';
import { cx } from '../../lib/cx';
import { formatClock, formatOffset, type TimeFormat } from '../../lib/format';
import { searchCities } from '../../lib/search';
import { getUtcOffsetMinutes, getZonedTime } from '../../lib/time';
import { useAppStore } from '../../store/app-store';

interface CityClock {
  minutes: number;
  offset: number;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

export function CityPicker() {
  const cityIds = useAppStore((state) => state.cityIds);
  const addCity = useAppStore((state) => state.addCity);
  const format = useAppStore((state) => state.settings.timeFormat);
  const now = useNow();

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const isSearching = query.trim().length > 0;
  const added = useMemo(() => new Set(cityIds), [cityIds]);
  const results = useMemo(() => searchCities(query), [query]);
  const selectable = useMemo(() => results.filter((city) => !added.has(city.id)), [results, added]);
  const groups = useMemo(
    () =>
      isSearching
        ? [{ region: null, cities: results }]
        : REGIONS.map((region) => ({ region, cities: results.filter((city) => city.region === region) })),
    [isSearching, results],
  );
  const clocks = useMemo(
    () =>
      new Map<string, CityClock>(
        CITIES.map((city) => [
          city.id,
          { minutes: getZonedTime(city.timeZone, now).minutesOfDay, offset: getUtcOffsetMinutes(city.timeZone, now) },
        ]),
      ),
    [now],
  );

  const active = selectable.find((city) => city.id === activeId) ?? selectable[0];
  const optionId = (cityId: string) => `${listboxId}-option-${cityId}`;

  useEffect(() => {
    if (!open || !active) return;
    document.getElementById(`${listboxId}-option-${active.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listboxId]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const slash = event.key === '/' && !isTypingTarget(event.target);
      const commandK = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      if (!slash && !commandK) return;
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const select = (city: City) => {
    addCity(city.id);
    setQuery('');
    setActiveId(null);
    setOpen(false);
  };

  const move = (delta: 1 | -1) => {
    if (!open) {
      setOpen(true);
      return;
    }
    if (selectable.length === 0) return;
    const index = active ? selectable.indexOf(active) : -1;
    setActiveId(selectable[(index + delta + selectable.length) % selectable.length].id);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Enter':
        if (open && active) {
          event.preventDefault();
          select(active);
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (open) setOpen(false);
        else if (query) setQuery('');
        else inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className="relative w-full sm:flex-1 xl:w-80 xl:flex-none">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Add a city"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && active ? optionId(active.id) : undefined}
        placeholder="Add a city or country…"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveId(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onInputKeyDown}
        className="h-11 w-full rounded-xl border border-line bg-surface pr-10 pl-10 text-sm text-ink shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] placeholder:text-ink-3 hover:border-line-strong focus:border-line-strong focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ink)_6%,transparent)] focus:outline-none"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setQuery('');
            setActiveId(null);
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : (
        <kbd className="kbd pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 sm:inline-grid">/</kbd>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onMouseDown={(event) => event.preventDefault()}
            className="popover absolute top-full right-0 z-40 mt-2 w-full origin-top overflow-hidden sm:w-[26rem]"
          >
            <div
              id={listboxId}
              role="listbox"
              aria-label="Cities"
              className="max-h-[min(24rem,55vh)] overflow-y-auto overscroll-contain p-1.5"
            >
              {results.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-3">
                  No city matches “{query.trim()}”.
                  <span className="mt-1 block text-xs">Try a country name, like “Japan” or “Brazil”.</span>
                </p>
              ) : (
                groups.map(
                  ({ region, cities }) =>
                    cities.length > 0 && (
                      <div
                        key={region ?? 'results'}
                        role="group"
                        aria-label={region ?? 'Matching cities'}
                      >
                        {region && (
                          <div
                            aria-hidden
                            className="sticky top-0 z-10 bg-surface/95 px-2.5 pt-2.5 pb-1 text-[0.6875rem] font-semibold tracking-wider text-ink-3 uppercase backdrop-blur"
                          >
                            {region}
                          </div>
                        )}
                        {cities.map((city) => (
                          <CityOption
                            key={city.id}
                            id={optionId(city.id)}
                            city={city}
                            clock={clocks.get(city.id)}
                            format={format}
                            active={city.id === active?.id}
                            disabled={added.has(city.id)}
                            onSelect={() => select(city)}
                            onHover={() => setActiveId(city.id)}
                          />
                        ))}
                      </div>
                    ),
                )
              )}
            </div>
            <div className="hidden items-center gap-3 border-t border-line bg-sunken px-3 py-2 text-[0.6875rem] text-ink-3 sm:flex">
              <span className="flex items-center gap-1">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">↵</kbd>
                add
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">esc</kbd>
                close
              </span>
              <span className="ml-auto">{CITIES.length - added.size} available</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CityOptionProps {
  id: string;
  city: City;
  clock: CityClock | undefined;
  format: TimeFormat;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function CityOption({ id, city, clock, format, active, disabled, onSelect, onHover }: CityOptionProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onSelect}
      onMouseMove={disabled || active ? undefined : onHover}
      className={cx(
        'flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors',
        active && 'bg-sunken',
        disabled && 'opacity-45',
      )}
    >
      <span className="grid h-6 w-8 shrink-0 place-items-center rounded-md border border-line bg-surface font-mono text-[0.625rem] font-semibold text-ink-2">
        {city.countryCode}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{city.name}</span>
        <span className="block truncate text-xs text-ink-3">{city.country}</span>
      </span>
      {disabled ? (
        <span className="flex items-center gap-1 text-xs font-medium text-ink-3">
          <Check className="size-3.5" aria-hidden />
          Added
        </span>
      ) : (
        clock && (
          <span className="shrink-0 text-right font-mono text-xs leading-tight">
            <span className="block text-ink-2">{formatClock(clock.minutes, format)}</span>
            <span className="block text-ink-3">{formatOffset(clock.offset)}</span>
          </span>
        )
      )}
    </div>
  );
}
