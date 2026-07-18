import { useMailStore } from '@/store/mail-store'

const SYSTEM_LABEL_META: Record<string, { name: string; color: string } | undefined> = {
  important: { name: 'Important', color: '#f2b400' },
}

export function LabelChip({ labelId }: { labelId: string }) {
  const label = useMailStore((s) => s.labels.find((l) => l.id === labelId))
  const meta = label ?? SYSTEM_LABEL_META[labelId]
  if (!meta) return null

  return (
    <span
      className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
    >
      {meta.name}
    </span>
  )
}

export function threadCustomLabelIds(labelIds: string[]): string[] {
  const systemIds = new Set([
    'inbox',
    'starred',
    'snoozed',
    'sent',
    'draft',
    'important',
    'spam',
    'trash',
    'all',
    'scheduled',
    'category_primary',
    'category_social',
    'category_promotions',
    'category_updates',
    'category_forums',
  ])
  return labelIds.filter((id) => !systemIds.has(id))
}
