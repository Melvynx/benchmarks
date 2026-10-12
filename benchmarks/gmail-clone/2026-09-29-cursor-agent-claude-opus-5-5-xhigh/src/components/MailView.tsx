import { useEffect, useRef } from 'react';
import { MdOutlineMarkunread } from 'react-icons/md';
import { useElementWidth, useIsMobile, useThreadList } from '../hooks';
import { listOf, toHash, type Route } from '../lib/router';
import { useSettings } from '../store/settings';
import { ui } from '../store/ui';
import { MailList } from './MailList';
import { ThreadView } from './ThreadView';

type MailRoute = Exclude<Route, { view: 'settings' }>;

export function MailView({ route }: { route: MailRoute }) {
  const isMobile = useIsMobile();
  const pane = useSettings((s) => s.readingPane);
  const paneSize = useSettings((s) => s.paneSize);
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const listKey = toHash(listOf(route));
  const list = useThreadList(listOf(route));

  useEffect(() => {
    ui.set({ page: 0, selected: [], anchor: null });
  }, [listKey]);

  const mode = isMobile || (pane === 'right' && width > 0 && width < 760) ? 'none' : pane;
  const threadId = route.threadId;

  if (mode === 'none') {
    return (
      <div ref={wrapRef} className="h-full min-h-0">
        {threadId ? <ThreadView route={{ ...route, threadId }} /> : <MailList route={route} />}
      </div>
    );
  }

  const horizontal = mode === 'right';
  return (
    <div ref={wrapRef} className={horizontal ? 'flex h-full min-h-0' : 'flex h-full min-h-0 flex-col'}>
      <div className="min-h-0 min-w-0 shrink-0" style={horizontal ? { width: `${paneSize}%` } : { height: `${paneSize}%` }}>
        <MailList route={listOf(route)} />
      </div>
      <PaneDivider horizontal={horizontal} />
      <div className="min-h-0 min-w-0 flex-1">
        {threadId ? (
          <ThreadView route={{ ...route, threadId }} embedded />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-fg3">
            <MdOutlineMarkunread size={56} className="text-line-strong" />
            <div className="text-sm text-fg2">{list.length ? 'No conversation selected' : 'Nothing to read here'}</div>
            {list.length > 0 && <div className="text-xs">Select a conversation, or press j / k and Enter.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function PaneDivider({ horizontal }: { horizontal: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    e.preventDefault();
    const rect = parent.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const pct = horizontal ? ((ev.clientX - rect.left) / rect.width) * 100 : ((ev.clientY - rect.top) / rect.height) * 100;
      useSettings.getState().update({ paneSize: Math.round(Math.min(75, Math.max(25, pct))) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = horizontal ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const dec = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const inc = horizontal ? 'ArrowRight' : 'ArrowDown';
    if (e.key !== dec && e.key !== inc) return;
    e.preventDefault();
    const cur = useSettings.getState().paneSize;
    useSettings.getState().update({ paneSize: Math.min(75, Math.max(25, cur + (e.key === inc ? 3 : -3))) });
  };
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={horizontal ? 'vertical' : 'horizontal'}
      aria-label="Resize reading pane"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => useSettings.getState().update({ paneSize: 42 })}
      className={
        horizontal
          ? 'group relative w-px shrink-0 cursor-col-resize bg-line outline-none before:absolute before:inset-y-0 before:-left-1.5 before:w-3 focus-visible:bg-accent'
          : 'group relative h-px shrink-0 cursor-row-resize bg-line outline-none before:absolute before:inset-x-0 before:-top-1.5 before:h-3 focus-visible:bg-accent'
      }
    >
      <span className={horizontal ? 'absolute inset-y-0 -left-px w-[3px] bg-accent opacity-0 transition-opacity group-hover:opacity-100' : 'absolute inset-x-0 -top-px h-[3px] bg-accent opacity-0 transition-opacity group-hover:opacity-100'} />
    </div>
  );
}
