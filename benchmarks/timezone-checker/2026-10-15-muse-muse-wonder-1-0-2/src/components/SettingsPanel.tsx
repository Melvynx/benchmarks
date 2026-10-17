import { formatHour, type TimeFormat } from '../lib/time'

interface Props {
  wake: number
  sleep: number
  timeFormat: TimeFormat
  onWake: (v: number) => void
  onSleep: (v: number) => void
  onFormat: (v: TimeFormat) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function SettingsPanel({ wake, sleep, timeFormat, onWake, onSleep, onFormat }: Props) {
  return (
    <div className="settings" aria-label="Availability settings">
      <div className="setting">
        <label htmlFor="wake">Wake-up hour</label>
        <select id="wake" value={wake} onChange={(e) => onWake(Number(e.target.value))}>
          {HOURS.map((h) => (
            <option key={h} value={h}>{formatHour(h, timeFormat)} ({String(h).padStart(2, '0')}:00)</option>
          ))}
        </select>
      </div>
      <div className="setting">
        <label htmlFor="sleep">Sleep hour</label>
        <select id="sleep" value={sleep} onChange={(e) => onSleep(Number(e.target.value))}>
          {HOURS.map((h) => (
            <option key={h} value={h}>{formatHour(h, timeFormat)} ({String(h).padStart(2, '0')}:00)</option>
          ))}
        </select>
      </div>
      <div className="setting">
        <span className="setting-label" id="format-label">Time format</span>
        <div className="segmented" role="group" aria-labelledby="format-label">
          <button type="button" className={timeFormat === '12h' ? 'seg active' : 'seg'} onClick={() => onFormat('12h')} aria-pressed={timeFormat === '12h'}>12h</button>
          <button type="button" className={timeFormat === '24h' ? 'seg active' : 'seg'} onClick={() => onFormat('24h')} aria-pressed={timeFormat === '24h'}>24h</button>
        </div>
      </div>
    </div>
  )
}
