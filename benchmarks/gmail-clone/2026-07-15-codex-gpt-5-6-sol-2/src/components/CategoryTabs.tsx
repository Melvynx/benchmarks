import { Inbox, Info, Tag, Users } from 'lucide-react';

import type { MailCategory } from '../domain/mail';

interface CategoryTabsProps {
  currentCategory: MailCategory;
  counts: Record<MailCategory, number>;
  onChange: (category: MailCategory) => void;
}

const CATEGORIES = [
  { id: 'primary', label: 'Primary', icon: Inbox, tone: 'primary' },
  { id: 'promotions', label: 'Promotions', icon: Tag, tone: 'green' },
  { id: 'social', label: 'Social', icon: Users, tone: 'blue' },
  { id: 'updates', label: 'Updates', icon: Info, tone: 'gold' },
] as const;

export function CategoryTabs({ currentCategory, counts, onChange }: CategoryTabsProps) {
  return (
    <div className="category-tabs" role="tablist" aria-label="Inbox categories">
      {CATEGORIES.map(({ id, label, icon: CategoryIcon, tone }) => (
        <button
          type="button"
          role="tab"
          key={id}
          className={`category-tab category-tab--${tone}${
            currentCategory === id ? ' category-tab--active' : ''
          }`}
          aria-selected={currentCategory === id}
          onClick={() => onChange(id)}
        >
          <CategoryIcon aria-hidden="true" />
          <span>{label}</span>
          {counts[id] > 0 && id !== 'primary' ? (
            <span className="category-tab__badge">{counts[id]} new</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
