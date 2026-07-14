export function Legend() {
  return (
    <details className="group absolute bottom-3 left-3 z-10 max-w-[240px] rounded-lg border border-ink-700 bg-ink-950/90 text-ink-100 backdrop-blur-sm">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[11.5px] font-medium">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="transition-transform group-open:rotate-90">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Map key
      </summary>
      <div className="space-y-3 border-t border-ink-800 px-3 py-2.5 text-[11px] leading-snug text-ink-300">
        <div>
          <p className="mb-1 font-medium text-ink-100">Size = magnitude</p>
          <div className="flex items-end gap-2">
            {[2, 4, 6].map((m) => (
              <span key={m} className="flex flex-col items-center gap-1">
                <span
                  className="rounded-full border border-ink-100/60 bg-ink-600"
                  style={{ width: 4 + Math.sqrt(m) * 5.2, height: 4 + Math.sqrt(m) * 5.2 }}
                  aria-hidden="true"
                />
                <span className="tnum">M{m}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 font-medium text-ink-100">Color = depth</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-shallow" aria-hidden="true" /> Shallow (&lt; 70 km)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-intermediate" aria-hidden="true" /> Intermediate
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-deep" aria-hidden="true" /> Deep (&gt; 300 km)
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium text-ink-100">Ring = impact alert</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-alert-red" aria-hidden="true" /> Orange / red = act on official guidance
            </li>
          </ul>
        </div>
        <p>▲ marker = USGS issued tsunami information.</p>
        <p>The same encoding is available as text in the event list and detail panel.</p>
      </div>
    </details>
  );
}
