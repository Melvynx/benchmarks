import { APP_NAME } from '../config'

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-11 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-ink" />
      <circle cx="12.5" cy="16" r="7" fill="#7c7cf0" />
      <circle cx="19.5" cy="16" r="7" fill="#3fd68a" fillOpacity="0.92" />
    </svg>
  )
}

export function Header() {
  return (
    <header className="flex items-center gap-4">
      <Mark />
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{APP_NAME}</h1>
        <p className="mt-0.5 text-sm text-ink-2">
          Timezone overlap checker for remote teams. Find the hours everyone is awake.
        </p>
      </div>
    </header>
  )
}
