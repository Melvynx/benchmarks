import { Clock3, Globe2 } from 'lucide-react';

interface AppHeaderProps {
  currentDate: Date;
}

export function AppHeader({ currentDate }: AppHeaderProps) {
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(currentDate);

  return (
    <header className="app-header">
      <div className="page-shell app-header__inner">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            <Globe2 size={20} strokeWidth={2.2} />
          </span>
          <div>
            <p className="eyebrow">Timezone overlap</p>
            <h1>GPT-5.6</h1>
          </div>
        </div>

        <div className="date-stamp" title="Offsets refresh automatically">
          <Clock3 size={15} aria-hidden="true" />
          <span>Live offsets</span>
          <span className="date-stamp__divider" aria-hidden="true" />
          <time dateTime={currentDate.toISOString()}>{dateLabel}</time>
        </div>
      </div>
    </header>
  );
}
