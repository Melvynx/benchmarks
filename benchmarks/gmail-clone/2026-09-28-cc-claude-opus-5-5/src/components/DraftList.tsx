import { useMemo, useState } from 'react'
import { Trash2, Send, CalendarX, Paperclip } from 'lucide-react'
import type { Draft } from '../types'
import { useMail } from '../store/mail'
import { useUI } from '../store/ui'
import { formatListDate, formatScheduleLabel, formatLongDate } from '../lib/format'
import { stripHtml, sanitizeHtml } from '../lib/html'
import { Button, Checkbox, cx, IconButton, Modal, useIsMobile } from './ui'
import { firstName } from '../lib/avatar'

function recipients(d: Draft) {
  const all = [...d.to, ...d.cc, ...d.bcc]
  if (!all.length) return '(no recipients)'
  return all.map((c) => (all.length === 1 ? c.name || c.email : firstName(c.name || c.email))).join(', ')
}

export function DraftList({ scheduled }: { scheduled: boolean }) {
  const drafts = useMail((s) => s.drafts)
  const outbox = useMail((s) => s.outbox)
  const discardDraft = useMail((s) => s.discardDraft)
  const openDraft = useUI((s) => s.openDraft)
  const composes = useUI((s) => s.composes)
  const showToast = useUI((s) => s.showToast)
  const mobile = useIsMobile()
  const [sel, setSel] = useState<string[]>([])
  const [peek, setPeek] = useState<Draft | null>(null)

  const list = useMemo(() => {
    const src = scheduled ? Object.values(outbox).filter((d) => d.scheduled) : Object.values(drafts).filter((d) => !d.threadId || d.subject || stripHtml(d.html))
    return src.sort((a, b) => (scheduled ? (a.sendAt ?? 0) - (b.sendAt ?? 0) : b.updatedAt - a.updatedAt))
  }, [drafts, outbox, scheduled])

  const all = list.length > 0 && sel.length === list.length

  const cancel = (d: Draft) => {
    const restored = useMail.getState().cancelSend(d.id)
    if (restored) {
      openDraft(restored.id)
      showToast('Send canceled. Your message is back in Drafts.')
    }
    setPeek(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 pl-2 pr-4">
        <Checkbox checked={all} indeterminate={sel.length > 0 && !all} label="Select all" onChange={() => setSel(all || sel.length ? [] : list.map((d) => d.id))} />
        {sel.length > 0 && !scheduled && (
          <button
            type="button"
            className="h-8 rounded px-3 text-[14px] font-medium hover:bg-hover"
            onClick={() => {
              sel.forEach((id) => {
                discardDraft(id)
                useUI.getState().closeCompose(id)
              })
              showToast(`${sel.length} draft${sel.length > 1 ? 's' : ''} discarded.`)
              setSel([])
            }}
          >
            Discard drafts
          </button>
        )}
        {sel.length > 0 && scheduled && (
          <button
            type="button"
            className="h-8 rounded px-3 text-[14px] font-medium hover:bg-hover"
            onClick={() => {
              sel.forEach((id) => useMail.getState().cancelSend(id))
              showToast(`Scheduled send canceled for ${sel.length} message${sel.length > 1 ? 's' : ''}. Moved to Drafts.`)
              setSel([])
            }}
          >
            Cancel send
          </button>
        )}
        <span className="ml-auto text-[12px] text-muted">{list.length ? `1–${list.length} of ${list.length}` : ''}</span>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pb-24">
        {list.length === 0 && (
          <div className="px-6 py-20 text-center text-muted">
            {scheduled ? 'No scheduled messages. Use the arrow next to Send to schedule a message.' : "You don't have any saved drafts. Saving a draft allows you to keep a message you aren't ready to send yet."}
          </div>
        )}
        {list.map((d) => {
          const isSel = sel.includes(d.id)
          const open = composes.some((c) => c.id === d.id)
          return (
            <div
              key={d.id}
              role="row"
              onClick={() => (scheduled ? setPeek(d) : openDraft(d.id))}
              className={cx(
                'group relative flex cursor-pointer items-center border-b border-line/70 pr-3 hover:z-[1] hover:shadow-row',
                isSel ? 'bg-select' : 'bg-row-unread',
                mobile ? 'min-h-[72px] py-2 pl-1' : 'h-10 pl-2',
              )}
            >
              <Checkbox checked={isSel} label="Select" className="h-8 w-8" onChange={() => setSel(isSel ? sel.filter((x) => x !== d.id) : [...sel, d.id])} />
              <div className={cx('flex min-w-0 flex-1', mobile ? 'flex-col pl-2' : 'items-center')}>
                <div className={cx('shrink-0 truncate pr-4 text-[14px]', mobile ? '' : 'w-[200px] pl-2')}>
                  {scheduled ? (
                    <span>To: {recipients(d)}</span>
                  ) : (
                    <>
                      <span className="text-danger">Draft{open ? ' (open)' : ''}</span>
                      <span className="text-muted"> · {recipients(d)}</span>
                    </>
                  )}
                </div>
                <div className="min-w-0 flex-1 truncate text-[14px]">
                  {d.attachments.length > 0 && <Paperclip size={13} className="mr-1 inline text-muted" />}
                  <span>{d.subject || '(no subject)'}</span>
                  <span className="text-muted"> – {stripHtml(d.html).slice(0, 160)}</span>
                </div>
              </div>
              <div className="relative ml-3 flex w-[120px] shrink-0 justify-end text-[12px] text-muted">
                <span className="group-hover:invisible">{scheduled && d.sendAt ? formatScheduleLabel(d.sendAt) : formatListDate(d.updatedAt)}</span>
                <div className="absolute right-[-8px] top-1/2 hidden -translate-y-1/2 group-hover:flex">
                  {scheduled ? (
                    <>
                      <IconButton label="Send now" size="sm" onClick={(e) => { e.stopPropagation(); useMail.getState().deliverNow(d.id); showToast('Message sent.') }}>
                        <Send size={16} />
                      </IconButton>
                      <IconButton label="Cancel send" size="sm" onClick={(e) => { e.stopPropagation(); cancel(d) }}>
                        <CalendarX size={16} />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton
                      label="Discard draft"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        discardDraft(d.id)
                        useUI.getState().closeCompose(d.id)
                        showToast('Draft discarded.')
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Modal
        open={!!peek}
        onClose={() => setPeek(null)}
        width={600}
        title={peek?.subject || '(no subject)'}
        footer={
          peek && (
            <>
              <Button onClick={() => cancel(peek)}>Cancel send</Button>
              <Button
                variant="filled"
                onClick={() => {
                  useMail.getState().deliverNow(peek.id)
                  setPeek(null)
                  showToast('Message sent.')
                }}
              >
                Send now
              </Button>
            </>
          )
        }
      >
        {peek && (
          <div className="pb-2">
            <div className="mb-3 rounded-lg bg-active/60 px-3 py-2 text-[13px]">
              Send scheduled for <b>{formatLongDate(peek.sendAt ?? 0)}</b>
            </div>
            <div className="mb-3 text-[13px] text-muted">To: {[...peek.to, ...peek.cc].map((c) => `${c.name} <${c.email}>`).join(', ')}</div>
            <div className="mail-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(peek.html) }} />
          </div>
        )}
      </Modal>
    </div>
  )
}
