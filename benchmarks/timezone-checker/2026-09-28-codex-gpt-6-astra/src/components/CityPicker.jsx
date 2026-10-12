import { useState, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { CITIES } from '../time';
import { useDismiss } from '../hooks';
import Flag from './Flag';

const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function CityPicker({ cityIds, onAdd }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const container = useRef(null);
  useDismiss(container, () => setOpen(false));
  const available = CITIES.filter(city => !cityIds.includes(city.id) && normalize(`${city.name} ${city.country}`).includes(normalize(query)));

  function add(city) {
    onAdd(city.id);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="city-picker" ref={container}>
      <button className="add-city" onClick={() => { setOpen(!open); setQuery(''); }} aria-expanded={open} aria-controls="city-picker-panel">
        <Plus size={16} />Add city
      </button>
      {open && (
        <div className="picker-panel" id="city-picker-panel">
          <div className="search-input">
            <Search size={16} />
            <input autoFocus value={query} placeholder="Search city or country…" aria-label="Search cities"
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && available.length) add(available[0]); }} />
          </div>
          <div className="picker-label">{query ? 'SEARCH RESULTS' : 'EXPLORE THE WORLD'}</div>
          <div className="city-options">
            {available.length ? available.map(city => (
              <button key={city.id} onClick={() => add(city)}>
                <Flag code={city.code} /><span>{city.name}<small>{city.country}</small></span><Plus size={15} />
              </button>
            )) : <div className="empty-search">No cities found.<br /><span>Try another city or country.</span></div>}
          </div>
          <div className="picker-footer">{CITIES.length} cities. A world of possibilities.</div>
        </div>
      )}
    </div>
  );
}
