import type { City } from "../data/cities";

type IdentityProps = {
  city: City;
  reference: boolean;
  offsetLabel: string;
  nowLabel: string;
  onPromote: () => void;
};

export function CityIdentity({ city, reference, offsetLabel, nowLabel, onPromote }: IdentityProps) {
  return (
    <div className="identity">
      <div className="city-line">
        {reference ? (
          <span className="city-name">{city.name}</span>
        ) : (
          <button
            type="button"
            className="city-name"
            onClick={onPromote}
            aria-label={`Make ${city.name} the reference city`}
          >
            {city.name}
          </button>
        )}
        {reference ? <span className="ref">REF</span> : null}
      </div>
      <p className="country">{city.country}</p>
      <p className="meta">
        <span>{offsetLabel}</span>
        <span className="now">{nowLabel}</span>
      </p>
    </div>
  );
}

export function RemoveButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button type="button" className="remove" aria-label={`Remove ${name}`} onClick={onClick}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M4 4.5 11.5 12M11.5 4.5 4 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
