import { Globe2 } from 'lucide-react';
import { CITIES, DEFAULT_CITIES } from '../cities';
import { formatTime, localMinutes, type TimeFormat } from '../time';

export function WorldScene({ now, format }: { now: Date; format: TimeFormat }) {
  return <div className="world-scene" aria-label="Live times around the world">
    <svg className="world-art" viewBox="0 0 470 260" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="sphere" cx="0.3" cy="0.2" r="0.9"><stop stopColor="#f2f6e9" /><stop offset="1" stopColor="#dce8d5" /></radialGradient>
        <clipPath id="globe-clip"><circle cx="238" cy="127" r="89" /></clipPath>
      </defs>
      <ellipse cx="238" cy="130" rx="170" ry="63" transform="rotate(-25 238 130)" stroke="#ccd7c3" strokeDasharray="3 6" />
      <ellipse cx="238" cy="230" rx="77" ry="8" fill="#e8ecdf" opacity=".6" />
      <circle cx="238" cy="127" r="89" fill="url(#sphere)" stroke="#c5d4bd" />
      <g clipPath="url(#globe-clip)" stroke="#a5bca0" strokeWidth=".8" opacity=".64">
        <ellipse cx="238" cy="127" rx="31" ry="89" /><ellipse cx="238" cy="127" rx="66" ry="89" />
        <ellipse cx="238" cy="127" rx="89" ry="32" /><ellipse cx="238" cy="127" rx="89" ry="64" />
        <path d="M149 127h178M238 38v178" />
        <path d="m157 77 17-8 15 5 11-5 7 13-8 13 9 10-4 16-13 3-5 16-10-11-5-20-14-6zm47 69 14-7 20 15 1 20-13 12-5 23-8-9-3-22-11-15zm38-78 8-16 17-6 11 7 20-1 22 18-2 13-17-2-7 14-18-8-2 13-13 2-5-11-12-4zm2 39 18-9 20 10 6 20-8 11-9 23-16-5-2-15-10-9-6-16zm52 53 12-6 17 11-5 14-19 1-10-8z" fill="#b3c9a7" stroke="none" opacity=".72" />
      </g>
      <path d="M165 125Q222 52 292 143" stroke="#397458" strokeWidth="1.5" strokeDasharray="3 4" />
      <circle cx="165" cy="125" r="6" fill="#fafcf6" /><circle cx="165" cy="125" r="3" fill="#427955" />
      <circle cx="251" cy="83" r="6" fill="#fafcf6" /><circle cx="251" cy="83" r="3" fill="#427955" />
      <circle cx="292" cy="143" r="6" fill="#fafcf6" /><circle cx="292" cy="143" r="3" fill="#427955" />
      <circle cx="115" cy="64" r="5" fill="#d0dfa9" /><path d="M355 192v10m-5-5h10M335 45v6m-3-3h6" stroke="#94a887" strokeLinecap="round" />
    </svg>
    {DEFAULT_CITIES.map((id, index) => {
      const city = CITIES.find(item => item.id === id)!;
      return <div className={`world-label world-label-${index}`} key={id}>
        <span className="world-dot" /><span>{city.name}</span>
        <strong>{formatTime(localMinutes(city.timezone, now), format)}</strong>
      </div>;
    })}
    <span className="world-caption"><Globe2 size={12} /> A smaller world. A shared moment.</span>
  </div>;
}
