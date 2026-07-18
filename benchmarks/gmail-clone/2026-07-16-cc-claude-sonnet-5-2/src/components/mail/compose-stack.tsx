import { useMailStore } from '@/store/mail-store'
import { ComposeWindow } from './compose-window'

export function ComposeStack() {
  const composeWindows = useMailStore((s) => s.composeWindows)

  if (composeWindows.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end gap-2 px-4 sm:px-6">
      {composeWindows.map((draft) => (
        <div key={draft.id} className="pointer-events-auto">
          <ComposeWindow draft={draft} />
        </div>
      ))}
    </div>
  )
}
