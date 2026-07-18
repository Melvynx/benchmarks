import { useState } from 'react'
import { addHours, nextMonday, nextSaturday, set, startOfTomorrow } from 'date-fns'
import { Clock } from 'lucide-react'
import { formatShortDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SnoozeOption {
  label: string
  date: () => Date
}

const OPTIONS: SnoozeOption[] = [
  { label: 'Later today', date: () => addHours(new Date(), 4) },
  { label: 'Tomorrow', date: () => set(startOfTomorrow(), { hours: 9 }) },
  { label: 'This weekend', date: () => set(nextSaturday(new Date()), { hours: 9 }) },
  { label: 'Next week', date: () => set(nextMonday(new Date()), { hours: 9 }) },
]

export function SnoozeMenu({
  onSnooze,
  title = 'Snooze until...',
}: {
  onSnooze: (until: string) => void
  title?: string
}) {
  const [customDate, setCustomDate] = useState('')

  return (
    <div className="flex w-60 flex-col gap-0.5">
      <p className="px-2 pb-1 text-sm font-medium">{title}</p>
      {OPTIONS.map((opt) => {
        const date = opt.date()
        return (
          <button
            key={opt.label}
            onClick={() => onSnooze(date.toISOString())}
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
          >
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              {opt.label}
            </span>
            <span className="text-xs text-muted-foreground">{formatShortDateTime(date.toISOString())}</span>
          </button>
        )
      })}
      <div className="mt-1 flex items-center gap-2 border-t border-border px-2 pt-2">
        <Input
          type="datetime-local"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          disabled={!customDate}
          onClick={() => customDate && onSnooze(new Date(customDate).toISOString())}
        >
          Set
        </Button>
      </div>
    </div>
  )
}
