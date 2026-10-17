import type { City } from "../../lib/cities";
import { formatUtcOffset } from "../../lib/time";
import { XIcon } from "../icons";
import styles from "./grid.module.css";

interface CityNameProps {
  city: City;
  isReference: boolean;
  onPromote: (id: string) => void;
}

export function CityName({ city, isReference, onPromote }: CityNameProps) {
  return (
    <div className={styles.cityNameRow}>
      {isReference ? (
        <span className={styles.cityName} title={`${city.name} is the reference city`}>
          {city.name}
        </span>
      ) : (
        <button
          type="button"
          className={styles.cityNameButton}
          title={`Make ${city.name} the reference city`}
          onClick={() => onPromote(city.id)}
        >
          {city.name}
        </button>
      )}
      {isReference && (
        <span className={styles.refBadge} aria-label="Reference city">
          REF
        </span>
      )}
    </div>
  );
}

export function OffsetBadge({ offsetMinutes }: { offsetMinutes: number }) {
  return <span className={styles.offset}>{formatUtcOffset(offsetMinutes)}</span>;
}

export function RemoveButton({ city, onRemove }: { city: City; onRemove: (id: string) => void }) {
  return (
    <button
      type="button"
      className={styles.removeButton}
      aria-label={`Remove ${city.name}`}
      title={`Remove ${city.name}`}
      onClick={() => onRemove(city.id)}
    >
      <XIcon size={15} />
    </button>
  );
}
