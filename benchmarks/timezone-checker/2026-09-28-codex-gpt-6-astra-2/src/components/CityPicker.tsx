import { useEffect, useRef, useState } from 'react';
import { Check, MapPin, Plus, Search, X } from 'lucide-react';
import { CITIES } from '../cities';

export function CityPicker({ selected, onAdd }: { selected: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const cities = CITIES.filter(city => `${city.name} ${city.country}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalized));
  const available = cities.filter(city => !selected.includes(city.id));

  function close() { setOpen(false); trigger.current?.focus(); }
  function add(id: string) { onAdd(id); setQuery(''); close(); }

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <div className="picker-anchor" ref={root} onKeyDown={event => { if (event.key === 'Escape') close(); }}>
    <button className="button button-primary" ref={trigger} aria-expanded={open} aria-controls="city-picker" onClick={() => { setOpen(!open); setQuery(''); setActive(0); }}><Plus size={17} /> Add city</button>
    {open && <div id="city-picker" className="popover city-picker" role="dialog" aria-label="Add a city">
      <div className="popover-heading"><span>A world of possibilities</span><button className="icon-button" onClick={close} aria-label="Close city picker"><X size={16} /></button></div>
      <div className="search-field"><Search size={17} /><input ref={search} placeholder="Search city or country…" aria-label="Search city or country" role="combobox" aria-expanded="true" aria-controls="city-results" aria-activedescendant={available[active] ? `option-${available[active].id}` : undefined} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(current => Math.min(current + 1, available.length - 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive(current => Math.max(0, current - 1)); }
        if (event.key === 'Enter' && available[active]) { event.preventDefault(); add(available[active].id); }
      }} /></div>
      <div className="city-results" id="city-results" role="listbox" aria-label="Cities" aria-multiselectable="true">
        {cities.map(city => {
          const added = selected.includes(city.id);
          return <button role="option" aria-selected={added} aria-disabled={added} id={`option-${city.id}`} key={city.id} className={`city-option ${available[active]?.id === city.id ? 'active-option' : ''}`} disabled={added} onClick={() => add(city.id)} ref={element => { if (element && available[active]?.id === city.id && active > 0) element.scrollIntoView({ block: 'nearest' }); }}>
            <span className="option-flag" aria-hidden="true">{city.flag}</span><span><strong>{city.name}</strong><small>{city.country}</small></span>{added ? <Check size={16} /> : <Plus size={16} />}
          </button>;
        })}
        {!cities.length && <div className="no-results"><MapPin size={24} /><strong>No cities found</strong><span>Try another city or country.</span></div>}
      </div>
      <div className="picker-footer">34 cities. Countless connections.</div>
    </div>}
  </div>;
}
