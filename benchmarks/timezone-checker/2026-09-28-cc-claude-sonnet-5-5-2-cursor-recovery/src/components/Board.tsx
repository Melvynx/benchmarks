import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './Board.module.css'
import { DesktopGrid } from './DesktopGrid'
import type { GridProps } from './GridTypes'
import { MobileGrid } from './MobileGrid'

export const DESKTOP_QUERY = '(min-width: 768px)'

/** Picks between two purpose-built layouts rather than reflowing one grid. */
export function Board(props: GridProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  if (props.views.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No cities yet</p>
        <p>Add a city above to compare timezones.</p>
      </div>
    )
  }

  return isDesktop ? <DesktopGrid {...props} /> : <MobileGrid {...props} />
}
