import type { City } from '../data/cities'
import { cityCode, formatUtcOffset } from '../lib/time'

type Props = {
  city: City
  isReference: boolean
  offsetMinutes: number
  compact?: boolean
  onSetReference: (id: string) => void
}

export function CityMeta({ city, isReference, offsetMinutes, compact, onSetReference }: Props) {
  return (
    <div className={`city-meta${compact ? ' is-compact' : ''}`}>
      <div className="city-meta-top">
        {isReference ? <span className="ref-badge">REF</span> : null}
        <button
          type="button"
          className="city-name"
          onClick={() => onSetReference(city.id)}
          disabled={isReference}
          title={isReference ? 'Reference city' : `Set ${city.name} as reference`}
        >
          {compact ? cityCode(city.name) : city.name}
        </button>
      </div>
      <div className="city-meta-sub">
        {compact ? null : <span className="city-country">{city.country}</span>}
        <span className="city-offset">{formatUtcOffset(offsetMinutes)}</span>
      </div>
    </div>
  )
}
