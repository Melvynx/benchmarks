import styles from './SegmentedControl.module.css'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  name: string
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
}

/** Native radio inputs styled as segments, so arrow-key navigation comes for free. */
export function SegmentedControl<T extends string>({ name, label, options, value, onChange }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.group}>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            className={styles.input}
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span className={styles.label}>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
