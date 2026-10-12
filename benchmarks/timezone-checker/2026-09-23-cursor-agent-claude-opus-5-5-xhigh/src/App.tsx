import { AppHeader } from './components/AppHeader'
import { EmptyState } from './components/EmptyState'
import { DesktopGrid } from './components/grid/DesktopGrid'
import { MobileGrid } from './components/grid/MobileGrid'
import { Legend } from './components/Legend'
import { OverlapSummary } from './components/summary/OverlapSummary'
import { Toolbar } from './components/Toolbar'
import { useMediaQuery } from './hooks/use-media-query'
import { useSchedule } from './hooks/use-schedule'

export function App() {
  const schedule = useSchedule()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isTouch = useMediaQuery('(pointer: coarse)')
  const { reference, analysis, mode } = schedule

  return (
    <main className="mx-auto w-full max-w-[80rem] px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:px-10">
      <AppHeader reference={reference} now={schedule.now} format={schedule.format} />

      <div className="mt-10 flex flex-col gap-4 sm:mt-12">
        <Toolbar schedule={schedule} />
        {reference ? (
          <>
            <OverlapSummary schedule={schedule} />
            {isDesktop ? <DesktopGrid schedule={schedule} /> : <MobileGrid schedule={schedule} />}
            <Legend
              mode={mode}
              referenceName={reference.timeline.city.name}
              comparing={analysis !== null}
              touch={isTouch}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  )
}
