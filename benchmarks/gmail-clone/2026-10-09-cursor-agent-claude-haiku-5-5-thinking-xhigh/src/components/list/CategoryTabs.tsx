import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox, Info, Megaphone, Users } from 'lucide-react';
import { categoryUnread } from '../../domain/selectors';
import type { Category } from '../../domain/types';
import { cn } from '../../lib/cn';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';

const TABS: Array<{ id: Category; label: string; icon: LucideIcon }> = [
  { id: 'primary', label: 'Primary', icon: Inbox },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'promotions', label: 'Promotions', icon: Megaphone },
  { id: 'updates', label: 'Updates', icon: Info },
];

export function CategoryTabs() {
  const category = useUI((s) => s.category);
  const setCategory = useUI((s) => s.setCategory);
  const data = useMail((s) => s.data);
  const unread = useMemo(() => categoryUnread(data), [data]);

  return (
    <div role="tablist" aria-label="Inbox categories" className="flex shrink-0 overflow-x-auto border-b border-line">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = category === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setCategory(id)}
            className={cn(
              'relative flex min-w-[120px] flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition-colors hover:bg-hover',
              active ? 'font-semibold text-primary' : 'font-medium text-ink-3',
            )}
          >
            <Icon className="size-4" />
            <span>{label}</span>
            {unread[id] > 0 && (
              <span className="text-xs text-primary">{unread[id]} new</span>
            )}
            {active && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}
