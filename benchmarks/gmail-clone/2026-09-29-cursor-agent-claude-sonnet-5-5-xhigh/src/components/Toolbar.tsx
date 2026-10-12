import { useRef, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Mail,
  MailOpen,
  OctagonAlert,
  PanelRight,
  RefreshCw,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import type { Route } from '../lib/types';
import type { ListModel } from '../lib/listModel';
import {
  archiveThreads,
  deleteForever,
  discardCompose,
  markRead,
  moveToInbox,
  notSpamThreads,
  setImportant,
  spamThreads,
  starThreads,
  trashThreads,
  emptyFolder,
} from '../lib/actions';
import { navigate } from '../lib/router';
import { useIsWide } from '../lib/hooks';
import { Checkbox, IconButton, MenuList, Popover } from './primitives';
import { LabelButton, MoveButton, SnoozeButton } from './ToolbarActions';

export function Toolbar({ route, model }: { route: Route; model: ListModel }) {
  const selected = useUI((s) => s.selected);
  const refreshing = useUI((s) => s.refreshing);
  const pane = useMail((s) => s.settings.pane);
  const wide = useIsWide();
  const selectRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isDraftView = route.view === 'drafts' || route.view === 'scheduled';
  const pageIds = model.page.map((i) => i.id);
  const selectedOnPage = pageIds.filter((id) => selected.includes(id));
  const allSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const someSelected = selected.length > 0 && !allSelected;
  const threadItems = model.items.filter((i) => i.kind === 'thread');
  const selectedInfos = threadItems.filter((i) => selected.includes(i.id));
  const anyUnread = selectedInfos.some((i) => i.kind === 'thread' && i.info.unread);
  const anyStarred = selectedInfos.some((i) => i.kind === 'thread' && i.info.starred);
  const anyImportant = selectedInfos.some((i) => i.kind === 'thread' && i.info.thread.important);
  const count = selected.length;

  const selectBy = (pred: (i: (typeof model.page)[number]) => boolean) => useUI.getState().select(model.page.filter(pred).map((i) => i.id));

  const refresh = () => {
    const ui = useUI.getState();
    if (ui.refreshing) return;
    ui.set({ refreshing: true });
    const res = useMail.getState().tick();
    setTimeout(() => {
      useUI.getState().set({ refreshing: false });
      if (res.arrived.length === 0 && res.woken.length === 0 && res.sent.length === 0) useUI.getState().toast('No new mail.', [], 2200);
    }, 700);
  };

  const setPage = (p: number) => navigate({ ...route, page: p, threadId: undefined });

  return (
    <div className={`toolbar ${count ? 'has-selection' : ''}`} role="toolbar" aria-label="Mail actions">
      <div className="toolbar__group">
        <div className="toolbar__select">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            label={allSelected || someSelected ? 'Deselect all' : 'Select all'}
            onChange={() => useUI.getState().select(allSelected || someSelected ? [] : pageIds)}
          />
          <button ref={selectRef} type="button" className="toolbar__caret" aria-label="Select options" aria-haspopup="menu" aria-expanded={selectOpen} onClick={() => setSelectOpen(!selectOpen)}>
            <ChevronDown size={16} />
          </button>
          <Popover open={selectOpen} anchorRef={selectRef} onClose={() => setSelectOpen(false)}>
            <MenuList
              onClose={() => setSelectOpen(false)}
              items={[
                { label: 'All', onClick: () => useUI.getState().select(pageIds) },
                { label: 'None', onClick: () => useUI.getState().clearSelection() },
                { label: 'Read', disabled: isDraftView, onClick: () => selectBy((i) => i.kind === 'thread' && !i.info.unread) },
                { label: 'Unread', disabled: isDraftView, onClick: () => selectBy((i) => i.kind === 'thread' && i.info.unread) },
                { label: 'Starred', disabled: isDraftView, onClick: () => selectBy((i) => i.kind === 'thread' && i.info.starred) },
                { label: 'Unstarred', disabled: isDraftView, onClick: () => selectBy((i) => i.kind === 'thread' && !i.info.starred) },
              ]}
            />
          </Popover>
        </div>

        {count === 0 ? (
          <>
            <IconButton label="Refresh" onClick={refresh} className={refreshing ? 'is-spinning' : ''}>
              <RefreshCw size={19} />
            </IconButton>
            <IconButton ref={moreRef} label="More" onClick={() => setMoreOpen(!moreOpen)}>
              <EllipsisVertical size={20} />
            </IconButton>
            <Popover open={moreOpen} anchorRef={moreRef} onClose={() => setMoreOpen(false)}>
              <MenuList
                onClose={() => setMoreOpen(false)}
                items={[
                  {
                    label: 'Mark all as read',
                    disabled: isDraftView || !threadItems.some((i) => i.kind === 'thread' && i.info.unread),
                    onClick: () => {
                      const ids = threadItems.filter((i) => i.kind === 'thread' && i.info.unread).map((i) => i.id);
                      markRead(true, ids);
                    },
                  },
                  { label: `Select all ${model.total} conversations`, disabled: !model.total, onClick: () => useUI.getState().select(model.items.map((i) => i.id)) },
                  ...(route.view === 'trash' ? [{ label: 'Empty Trash now', danger: true, onClick: () => emptyFolder('trash') }] : []),
                  ...(route.view === 'spam' ? [{ label: 'Delete all spam messages now', danger: true, onClick: () => emptyFolder('spam') }] : []),
                ]}
              />
            </Popover>
          </>
        ) : isDraftView ? (
          <IconButton
            label={route.view === 'scheduled' ? 'Cancel send' : 'Discard drafts'}
            onClick={() => {
              selected.forEach((id) => discardCompose(id, { silent: true }));
              useUI.getState().toast(`${count} ${count === 1 ? 'draft' : 'drafts'} discarded.`);
              useUI.getState().clearSelection();
            }}
          >
            <Trash2 size={20} />
          </IconButton>
        ) : route.view === 'trash' ? (
          <>
            <IconButton label="Move to Inbox" onClick={() => moveToInbox()}>
              <Undo2 size={20} />
            </IconButton>
            <IconButton label="Delete forever" onClick={() => deleteForever()}>
              <Trash2 size={20} />
            </IconButton>
            <LabelButton ids={selected} />
          </>
        ) : route.view === 'spam' ? (
          <>
            <IconButton label="Not spam" onClick={() => notSpamThreads()}>
              <Undo2 size={20} />
            </IconButton>
            <IconButton label="Delete forever" onClick={() => deleteForever()}>
              <Trash2 size={20} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton label="Archive" onClick={() => archiveThreads()}>
              <Archive size={20} />
            </IconButton>
            <IconButton label="Report spam" onClick={() => spamThreads()}>
              <OctagonAlert size={20} />
            </IconButton>
            <IconButton label="Delete" onClick={() => trashThreads()}>
              <Trash2 size={20} />
            </IconButton>
            <span className="toolbar__sep" />
            <IconButton label={anyUnread ? 'Mark as read' : 'Mark as unread'} onClick={() => markRead(anyUnread)}>
              {anyUnread ? <MailOpen size={20} /> : <Mail size={20} />}
            </IconButton>
            <SnoozeButton ids={selected} />
            <MoveButton ids={selected} />
            <LabelButton ids={selected} />
            <IconButton ref={moreRef} label="More" onClick={() => setMoreOpen(!moreOpen)}>
              <EllipsisVertical size={20} />
            </IconButton>
            <Popover open={moreOpen} anchorRef={moreRef} onClose={() => setMoreOpen(false)}>
              <MenuList
                onClose={() => setMoreOpen(false)}
                items={[
                  { label: anyUnread ? 'Mark as read' : 'Mark as unread', onClick: () => markRead(anyUnread) },
                  { label: anyStarred ? 'Remove star' : 'Add star', onClick: () => starThreads(!anyStarred) },
                  { label: anyImportant ? 'Mark as not important' : 'Mark as important', onClick: () => setImportant(!anyImportant) },
                ]}
              />
            </Popover>
          </>
        )}
        {count > 0 ? <span className="toolbar__count">{count} selected</span> : null}
      </div>

      <div className="toolbar__spacer" />

      <div className="toolbar__group toolbar__pager">
        {model.total > 0 ? (
          <span className="toolbar__range" aria-live="polite">
            {model.start}–{model.end} of {model.total}
          </span>
        ) : null}
        <IconButton label="Newer" disabled={model.pageNo <= 1} onClick={() => setPage(model.pageNo - 1)}>
          <ChevronLeft size={20} />
        </IconButton>
        <IconButton label="Older" disabled={model.pageNo >= model.pageCount} onClick={() => setPage(model.pageNo + 1)}>
          <ChevronRight size={20} />
        </IconButton>
        {wide ? (
          <IconButton
            label={pane === 'right' ? 'Hide reading pane' : 'Show reading pane'}
            active={pane === 'right'}
            className="toolbar__pane"
            onClick={() => useMail.getState().setSettings({ pane: pane === 'right' ? 'off' : 'right' })}
          >
            <PanelRight size={20} />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="Back to list" onClick={onClick}>
      <ArrowLeft size={20} />
    </IconButton>
  );
}
