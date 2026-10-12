import { useNow } from '../../hooks/use-now';

const dateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export function Footer() {
  const now = useNow();
  return (
    <footer className="flex flex-col gap-1 px-1 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between">
      <p>UTC offsets as of {dateFormatter.format(now)} — daylight saving is applied automatically.</p>
      <p>Your cities and settings are saved in this browser.</p>
    </footer>
  );
}
