import { getFlagEmoji } from '../data/cities';
import { formatUtcOffset } from '../lib/timezone';
import type { City } from '../types';

interface CityLabelProps {
  city: City;
  offsetMinutes: number;
  isReference: boolean;
  compact?: boolean;
  onPromote: (cityId: string) => void;
}

export function CityLabel({
  city,
  offsetMinutes,
  isReference,
  compact = false,
  onPromote,
}: CityLabelProps) {
  return (
    <div className="city-label" data-compact={compact}>
      <span className="city-label__flag" aria-hidden="true">{getFlagEmoji(city.countryCode)}</span>
      <div className="city-label__copy">
        <div className="city-label__name-line">
          <button
            className="city-label__name"
            type="button"
            disabled={isReference}
            title={isReference ? `${city.name} is the reference city` : `Make ${city.name} the reference city`}
            onClick={() => onPromote(city.id)}
          >
            {city.name}
          </button>
          {isReference && <span className="reference-badge">REF</span>}
        </div>
        <span className="city-label__meta">
          {!compact && <span>{city.country}</span>}
          <span>{formatUtcOffset(offsetMinutes)}</span>
        </span>
      </div>
    </div>
  );
}
