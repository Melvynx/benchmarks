import { CircleQuestionMark, Mail, Menu, Settings } from 'lucide-react';
import type { Route } from '../../lib/route';
import { goFolder } from '../../lib/route';
import { useMediaQuery } from '../../hooks/useApp';
import { useUI } from '../../store/uiStore';
import { IconButton } from '../ui/primitives';
import { AccountMenu } from './AccountMenu';
import { SearchBar } from './SearchBar';

export function TopBar({ route }: { route: Route }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const drawerOpen = useUI((s) => s.drawerOpen);
  const setDrawerOpen = useUI((s) => s.setDrawerOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const setShortcutsOpen = useUI((s) => s.setShortcutsOpen);

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 px-2 pb-2 pt-2 md:h-16 md:flex-nowrap md:px-3 md:py-0">
      <IconButton
        label="Main menu"
        onClick={() => (isDesktop ? toggleSidebar() : setDrawerOpen(!drawerOpen))}
      >
        <Menu className="size-5" />
      </IconButton>
      <button
        type="button"
        onClick={() => goFolder('inbox')}
        className="flex min-w-0 items-center gap-2.5 rounded-lg pr-3 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
          <Mail className="size-5" />
        </span>
        <span className="truncate text-[18px] font-medium tracking-tight text-ink-2 md:text-[22px]">
          Claude Haiku 5.5
        </span>
      </button>

      <SearchBar route={route} className="order-last w-full md:order-none md:mx-auto md:max-w-[720px] md:flex-1" />

      <div className="ml-auto flex items-center gap-0.5">
        <IconButton label="Keyboard shortcuts" className="hidden sm:inline-flex" onClick={() => setShortcutsOpen(true)}>
          <CircleQuestionMark className="size-5" />
        </IconButton>
        <IconButton label="Settings" onClick={() => setSettingsOpen(true)}>
          <Settings className="size-5" />
        </IconButton>
        <AccountMenu />
      </div>
    </header>
  );
}
