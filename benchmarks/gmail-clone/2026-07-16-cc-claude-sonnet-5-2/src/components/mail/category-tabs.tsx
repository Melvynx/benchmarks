import { CATEGORY_TABS } from '@/lib/nav'
import { useMailStore } from '@/store/mail-store'
import { useCategoryCount } from './sidebar'
import { cn } from '@/lib/utils'

function CategoryTab({ id, label }: { id: string; label: string }) {
  const category = useMailStore((s) => s.category)
  const setCategory = useMailStore((s) => s.setCategory)
  const count = useCategoryCount(id)
  const active = category === id

  return (
    <button
      onClick={() => setCategory(id)}
      className={cn(
        'relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-[13px] font-medium tracking-wide text-muted-foreground transition-colors hover:bg-surface-hover sm:flex-none',
        active && 'text-accent',
      )}
    >
      {label}
      {count > 0 && <span className="text-[12px] font-semibold">{count}</span>}
      {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}
    </button>
  )
}

export function CategoryTabs() {
  return (
    <div className="flex overflow-x-auto border-b border-border scrollbar-none">
      {CATEGORY_TABS.map((tab) => (
        <CategoryTab key={tab.id} id={tab.id} label={tab.label} />
      ))}
    </div>
  )
}
