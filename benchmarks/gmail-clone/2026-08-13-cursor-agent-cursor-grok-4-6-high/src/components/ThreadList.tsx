import { useApp } from '../lib/app'
import { contactByEmail } from '../lib/contacts'
import { formatListDate, snippetFromHtml } from '../lib/format'
import { lastMessage, messagesOf, sendersLine, threadUnread } from '../lib/search'
import { useDispatch, useIndex, useStore } from '../lib/store'
import { SYS } from '../lib/types'
import { Icon } from './Icon'
import { Avatar, cx } from './ui'

export function ThreadList({ compact }: { compact?: boolean }) {
  const app = useApp()
  const store = useStore()
  const dispatch = useDispatch()
  const index = useIndex()
  const density = store.settings.density
  const h = density === 'compact' ? 'h-8' : density === 'comfortable' ? 'h-10' : 'h-12'

  if (app.visibleThreads.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-ink-3">
        <Icon name="mailOpen" size={48} className="text-ink-4" />
        <p className="text-[16px] text-ink-2">No conversations in this view.</p>
        <p className="max-w-sm text-[13px]">Try another mailbox, or compose a message.</p>
      </div>
    )
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-auto" role="list">
      {app.visibleThreads.map((thread) => {
        const unread = threadUnread(index, thread)
        const selected = store.selectedIds.includes(thread.id)
        const active = app.route.threadId === thread.id
        const last = lastMessage(index, thread)
        const msgs = messagesOf(index, thread)
        const from = last ? contactByEmail(last.from) : contactByEmail('')
        const starred = thread.labels.includes(SYS.STARRED)
        const important = thread.labels.includes(SYS.IMPORTANT)
        const hasAtt = msgs.some((m) => (m.attachments?.length ?? 0) > 0)
        const labels = store.labels.filter((l) => thread.labels.includes(l.id))
        const snip = last ? snippetFromHtml(last.body) : ''
        const count = msgs.length

        return (
          <div
            key={thread.id}
            role="listitem"
            onClick={() => {
              if (thread.labels.includes(SYS.DRAFT) && msgs.some((m) => m.draft) && (msgs.every((m) => m.draft) || thread.labels.includes(SYS.SCHEDULED))) {
                app.openDraft(thread.id)
                return
              }
              app.openThread(thread.id)
              if (unread) dispatch({ t: 'markRead', ids: [thread.id], unread: false })
            }}
            className={cx(
              'group flex cursor-pointer items-center gap-1 border-b border-line px-2 text-[14px]',
              h,
              selected ? 'bg-selected' : unread ? 'bg-panel' : 'bg-canvas/40',
              active && !selected && 'bg-selected-soft/40',
              !selected && 'hover:shadow-e1',
            )}
          >
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-hov"
              aria-label={selected ? 'Deselect' : 'Select'}
              onClick={(e) => {
                e.stopPropagation()
                const ids = app.visibleThreads.map((t) => t.id)
                if (e.shiftKey && store.lastSelectedId) {
                  const a = ids.indexOf(store.lastSelectedId)
                  const b = ids.indexOf(thread.id)
                  if (a >= 0 && b >= 0) {
                    const [lo, hi] = a < b ? [a, b] : [b, a]
                    dispatch({ t: 'toggleSelect', id: thread.id, rangeIds: ids.slice(lo, hi + 1) })
                    return
                  }
                }
                dispatch({ t: 'toggleSelect', id: thread.id })
              }}
            >
              {store.settings.senderImages && !selected ? (
                <span className="grid place-items-center group-hover:hidden">
                  <Avatar name={from.name} hue={from.hue} size={28} />
                </span>
              ) : null}
              <span className={cx(store.settings.senderImages && !selected && 'hidden group-hover:grid')}>
                <Icon name={selected ? 'checkboxOn' : 'checkbox'} size={20} className="text-ink-3" />
              </span>
            </button>

            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-hov"
              aria-label={starred ? 'Unstar' : 'Star'}
              onClick={(e) => {
                e.stopPropagation()
                dispatch({ t: 'star', ids: [thread.id], starred: !starred })
              }}
            >
              <Icon name={starred ? 'star' : 'starOutline'} size={20} className={starred ? 'text-star' : 'text-ink-4'} />
            </button>

            <button
              type="button"
              className="hidden size-8 shrink-0 place-items-center rounded-full hover:bg-hov sm:grid"
              aria-label={important ? 'Not important' : 'Important'}
              onClick={(e) => {
                e.stopPropagation()
                dispatch({ t: 'important', ids: [thread.id], important: !important })
              }}
            >
              <Icon
                name={important ? 'important' : 'importantOutline'}
                size={18}
                className={important ? 'text-star' : 'text-ink-4'}
              />
            </button>

            <div className={cx('min-w-0 shrink-0', compact ? 'w-[140px]' : 'w-[180px] sm:w-[220px]')}>
              <span className={cx('block truncate', unread ? 'font-bold text-ink' : 'font-normal text-ink-2')}>
                {sendersLine(index, thread)}
                {count > 1 && <span className="ml-1 font-normal text-ink-3">{count}</span>}
              </span>
            </div>

            <div className="min-w-0 flex-1 truncate">
              <span className={cx(unread ? 'font-bold text-ink' : 'text-ink-2')}>{thread.subject}</span>
              {store.settings.snippets && (
                <span className="text-ink-3">
                  {' - '}
                  {last?.draft ? 'Draft: ' : ''}
                  {snip}
                </span>
              )}
              {labels.length > 0 && (
                <span className="ml-2 hidden gap-1 sm:inline-flex">
                  {labels.map((l) => (
                    <span
                      key={l.id}
                      className="rounded px-1.5 py-px text-[11px] font-medium text-panel"
                      style={{ background: l.color }}
                    >
                      {l.name}
                    </span>
                  ))}
                </span>
              )}
            </div>

            {hasAtt && <Icon name="attach" size={16} className="hidden shrink-0 text-ink-3 sm:block" />}

            <span className={cx('w-[72px] shrink-0 pr-2 text-right text-[12px] tabular-nums', unread ? 'font-bold text-ink' : 'text-ink-3')}>
              {formatListDate(thread.lastActivity)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
