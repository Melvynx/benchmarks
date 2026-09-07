import { formatHour, type TimeFormat } from '../lib/time'

type Props = {
  format: TimeFormat
  nowHour: number | null
}

export function HourHeader({ format, nowHour }: Props) {
  return (
    <div className="hour-header" aria-hidden="true">
      <div className="hour-header-spacer" />
      <div className="hour-header-cells">
        {Array.from({ length: 24 }, (_, hour) => {
          const label = format === '24h' ? String(hour).padStart(2, '0') : formatHour(hour, '12h')
          const showMeridiem = format === '12h' && (hour === 0 || hour === 12)
          return (
            <div key={hour} className={`hour-tick${nowHour === hour ? ' is-now' : ''}`}>
              <span className="hour-tick-num">
                {format === '24h' ? label : hour % 12 === 0 ? 12 : hour % 12}
              </span>
              {showMeridiem ? (
                <span className="hour-tick-meridiem">{hour < 12 ? 'am' : 'pm'}</span>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="hour-header-end" />
    </div>
  )
}
