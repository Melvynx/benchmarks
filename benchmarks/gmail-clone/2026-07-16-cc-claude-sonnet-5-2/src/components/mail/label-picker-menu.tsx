import { Check, Tag } from 'lucide-react'
import { useMailStore } from '@/store/mail-store'

export function LabelPickerMenu({
  threadIds,
  currentLabelIds,
}: {
  threadIds: string[]
  currentLabelIds: string[]
}) {
  const labels = useMailStore((s) => s.labels)
  const applyLabel = useMailStore((s) => s.applyLabel)
  const removeLabel = useMailStore((s) => s.removeLabel)

  if (labels.length === 0) {
    return <p className="px-2 py-3 text-sm text-muted-foreground">No labels yet. Create one from the sidebar.</p>
  }

  return (
    <div className="flex w-56 flex-col gap-0.5">
      <p className="flex items-center gap-1.5 px-2 pb-1 text-sm font-medium">
        <Tag className="size-3.5" />
        Label as
      </p>
      {labels.map((label) => {
        const applied = currentLabelIds.includes(label.id)
        return (
          <button
            key={label.id}
            onClick={() => (applied ? removeLabel(threadIds, label.id) : applyLabel(threadIds, label.id))}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
          >
            <span className="flex size-4 items-center justify-center">
              {applied && <Check className="size-3.5" style={{ color: label.color }} />}
            </span>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: label.color }} />
            <span className="flex-1 truncate">{label.name}</span>
          </button>
        )
      })}
    </div>
  )
}
