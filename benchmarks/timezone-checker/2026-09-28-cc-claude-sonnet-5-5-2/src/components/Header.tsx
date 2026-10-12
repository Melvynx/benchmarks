import { APP_TITLE } from '../config'
import styles from './Header.module.css'
import { Logo } from './Icons'

export function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.logo}>
        <Logo size={44} />
      </span>
      <div>
        <h1 className={styles.title}>{APP_TITLE}</h1>
        <p className={styles.tagline}>Timezone overlap checker. Find the hours when everyone is awake.</p>
      </div>
    </header>
  )
}
