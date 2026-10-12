import type { CityView } from '../hooks/useBoard'
import styles from './CityName.module.css'

interface Props {
  view: CityView
  onPromote: (id: string) => void
}

export function CityName({ view, onPromote }: Props) {
  const { city, isReference } = view
  return (
    <span className={styles.wrap}>
      {isReference ? (
        <span className={styles.name}>{city.name}</span>
      ) : (
        <button
          type="button"
          className={`${styles.name} ${styles.promote}`}
          title={`Make ${city.name} the reference city`}
          onClick={() => onPromote(city.id)}
        >
          {city.name}
        </button>
      )}
      {isReference && (
        <span className={styles.badge} title="Reference city: grid hours follow its clock">
          REF
        </span>
      )}
    </span>
  )
}
