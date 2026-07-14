import { Globe2 } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="brand-mark" aria-hidden="true">
        <Globe2 size={20} strokeWidth={1.8} />
      </div>
      <div>
        <h1>GPT 5.6</h1>
        <p>Find the hours that feel human for everyone.</p>
      </div>
      <div className="header-status" aria-label="Timezone data status">
        <span className="status-dot" />
        Live DST offsets
      </div>
    </header>
  );
}
