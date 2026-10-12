import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Maximize2, Minus, Paperclip, Quote, RemoveFormatting, Trash, Underline, X } from 'lucide-react';
import { draftHasContent } from '../../domain/drafts';
import { contactsOf } from '../../domain/selectors';
import { isValidEmail } from '../../domain/threads';
import type { Attachment, Draft, Outgoing } from '../../domain/types';
import { cn } from '../../lib/cn';
import { registerBlob } from '../../lib/blobs';
import { uid } from '../../lib/ids';
import { plural, kindFromName } from '../../lib/format';
import { goFolder } from '../../lib/route';
import { sanitizeHtml } from '../../lib/sanitize';
import { escapeHtml } from '../../lib/text';
import { formatSendAt } from '../../lib/time';
import * as actions from '../../store/actions';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';
import { AttachmentList } from '../thread/AttachmentList';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/primitives';
import { RecipientField } from './RecipientField';
import { ScheduleMenu } from './ScheduleMenu';

interface ComposeFormProps {
  initial: Draft;
  mobile: boolean;
  minimized: boolean;
  maximized: boolean;
  /** Horizontal offset for stacked desktop windows. */
  offset: number;
}

/** Restores a message from the undo-send window back into Drafts and reopens it. */
function undoSend(outgoingId: string): void {
  const restored = actions.cancelOutgoing(outgoingId);
  if (restored) useUI.getState().openCompose(restored.id);
}

export function ComposeForm({ initial, mobile, minimized, maximized, offset }: ComposeFormProps) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [showCc, setShowCc] = useState(initial.cc.length > 0);
  const [showBcc, setShowBcc] = useState(initial.bcc.length > 0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkRange = useRef<Range | null>(null);
  // Set once the draft has been sent, discarded, or otherwise handed off, so unmounting doesn't resurrect it.
  const finished = useRef(false);
  const latest = useRef(draft);
  latest.current = draft;

  const settings = useMail((s) => s.data.settings);
  const account = useMail((s) => s.data.account);
  const threads = useMail((s) => s.data.threads);
  const contacts = useMemo(() => contactsOf(account, threads), [account, threads]);

  // The editor owns its DOM after mount, so the body is written once instead of through React children.
  useLayoutEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = sanitizeHtml(initial.html);
  }, []);

  // Debounced autosave. Untouched new messages never reach storage.
  useEffect(() => {
    if (draft.pristine) return;
    const timer = window.setTimeout(() => {
      if (!finished.current) actions.saveDraft({ ...draft, updatedAt: Date.now() });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft]);

  // Closing the window keeps real content in Drafts and drops empty ones.
  useEffect(
    () => () => {
      if (finished.current) return;
      const current = latest.current;
      if (draftHasContent(current)) actions.saveDraft({ ...current, updatedAt: Date.now() });
      else actions.removeDraft(current.id);
    },
    [],
  );

  const edit = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes, pristine: false }));

  const syncBody = () => {
    const html = editorRef.current?.innerHTML;
    if (html !== undefined) edit({ html });
  };

  const format = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    syncBody();
  };

  const openLink = () => {
    const selection = window.getSelection();
    linkRange.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    setLinkUrl('https://');
    setLinkOpen(true);
  };

  const applyLink = (e: FormEvent) => {
    e.preventDefault();
    setLinkOpen(false);
    const url = linkUrl.trim();
    if (!url || url === 'https://') return;
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (linkRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(linkRange.current);
    }
    if (linkRange.current && !linkRange.current.collapsed) format('createLink', url);
    else format('insertHTML', `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added = Array.from(files).map((file): Attachment => {
      const id = uid('att');
      registerBlob(id, file);
      return { id, name: file.name, size: file.size, kind: kindFromName(file.name) };
    });
    setDraft((d) => ({ ...d, attachments: [...d.attachments, ...added], pristine: false }));
  };

  const removeAttachment = (id: string) =>
    setDraft((d) => ({ ...d, attachments: d.attachments.filter((a) => a.id !== id), pristine: false }));

  /** Validates recipients; sets an inline error and returns false when the message can't go out yet. */
  const validate = (): boolean => {
    const all = [...draft.to, ...draft.cc, ...draft.bcc];
    if (all.length === 0) {
      setError('Add at least one recipient.');
      return false;
    }
    const invalid = all.filter((a) => !isValidEmail(a.email));
    if (invalid.length > 0) {
      setError(`Fix ${plural(invalid.length, 'invalid address')}: ${invalid.map((a) => a.email).join(', ')}`);
      return false;
    }
    setError(null);
    return true;
  };

  /** Moves the draft into the outgoing queue. Undo-send and scheduled sends both go through here. */
  const queue = (kind: 'undo' | 'scheduled', sendAt: number) => {
    const now = Date.now();
    const offline = !navigator.onLine || settings.offline;
    const queuedKind = offline && kind === 'undo' ? 'queued' : kind;
    const outgoing: Outgoing = {
      id: uid('out'),
      kind: queuedKind,
      sendAt: queuedKind === 'queued' ? 0 : sendAt,
      createdAt: now,
      draft: { ...draft, updatedAt: now, pristine: false },
    };
    finished.current = true;
    actions.queueOutgoing(outgoing);

    const ui = useUI.getState();
    ui.closeCompose(draft.id);
    if (queuedKind === 'queued') {
      ui.toast({ message: 'You’re offline. This message will send when you reconnect.', duration: 6000 });
    } else if (kind === 'undo') {
      ui.toast({
        message: 'Message sent',
        actionLabel: 'Undo',
        onAction: () => undoSend(outgoing.id),
        duration: settings.undoSendSeconds * 1000,
      });
    } else {
      ui.toast({
        message: `Scheduled for ${formatSendAt(sendAt, now)}`,
        actionLabel: 'View',
        onAction: () => goFolder('scheduled'),
        duration: 6000,
      });
    }
  };

  const sendNow = () => {
    if (!validate()) return;
    queue('undo', Date.now() + settings.undoSendSeconds * 1000);
  };

  const scheduleAt = (at: number) => {
    if (!validate()) return;
    queue('scheduled', at);
  };

  const discard = () => {
    finished.current = true;
    actions.removeDraft(draft.id);
    useUI.getState().closeCompose(draft.id);
  };

  const close = () => useUI.getState().closeCompose(draft.id);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendNow();
    }
  };

  const frameStyle: CSSProperties | undefined = mobile
    ? undefined
    : maximized
      ? { top: 72, bottom: 0, left: 24, right: 24 }
      : { right: 24 + offset, bottom: 0 };

  const frame = cn(
    'fixed z-[45] flex flex-col overflow-hidden bg-surface text-ink shadow-2xl',
    mobile ? 'inset-0' : 'rounded-t-xl border border-b-0 border-line',
    !mobile && !maximized && (minimized ? 'w-[288px]' : 'h-[min(620px,calc(100dvh-4rem))] w-[540px] max-w-[calc(100vw-2rem)]'),
  );

  const title = draft.subject.trim() || 'New message';

  return (
    <section aria-label={title} onKeyDown={onKeyDown} className={frame} style={frameStyle}>
      <header className="flex h-11 shrink-0 select-none items-center gap-1 bg-surface-2 pl-4 pr-1.5">
        <button
          type="button"
          onClick={() => !mobile && useUI.getState().toggleMinimize(draft.id)}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium"
        >
          {title}
        </button>
        {!mobile && (
          <>
            <IconButton label={minimized ? 'Restore window' : 'Minimize'} onClick={() => useUI.getState().toggleMinimize(draft.id)} className="size-8">
              {minimized ? <Maximize2 className="size-4" /> : <Minus className="size-4" />}
            </IconButton>
            <IconButton
              label={maximized ? 'Exit full screen' : 'Full screen'}
              onClick={() => useUI.getState().toggleMaximize(draft.id)}
              className="size-8"
            >
              <Maximize2 className="size-4" />
            </IconButton>
          </>
        )}
        <IconButton label="Close" onClick={close} className="size-8">
          <X className="size-4" />
        </IconButton>
      </header>

      {!minimized && (
        <>
          <RecipientField
            id={`to-${draft.id}`}
            label="To"
            value={draft.to}
            onChange={(to) => edit({ to })}
            contacts={contacts}
            autoFocus={draft.pristine}
            trailing={
              <>
                {!showCc && (
                  <button type="button" onClick={() => setShowCc(true)} className="font-medium text-ink-3 hover:text-ink">
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button type="button" onClick={() => setShowBcc(true)} className="font-medium text-ink-3 hover:text-ink">
                    Bcc
                  </button>
                )}
              </>
            }
          />
          {showCc && (
            <RecipientField id={`cc-${draft.id}`} label="Cc" value={draft.cc} onChange={(cc) => edit({ cc })} contacts={contacts} />
          )}
          {showBcc && (
            <RecipientField id={`bcc-${draft.id}`} label="Bcc" value={draft.bcc} onChange={(bcc) => edit({ bcc })} contacts={contacts} />
          )}

          <div className="border-b border-line/60 px-4">
            <input
              aria-label="Subject"
              placeholder="Subject"
              value={draft.subject}
              onChange={(e) => edit({ subject: e.target.value })}
              className="w-full bg-transparent py-2.5 text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-ink-3"
            />
          </div>

          <div
            ref={editorRef}
            role="textbox"
            aria-label="Message body"
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write your message"
            onInput={syncBody}
            className="compose-editor mail-html min-h-[160px] flex-1 overflow-y-auto break-words px-4 py-3 text-[15px] leading-relaxed text-ink outline-none"
          />

          <div className="px-4">
            <AttachmentList attachments={draft.attachments} onRemove={removeAttachment} />
          </div>

          {linkOpen && (
            <form onSubmit={applyLink} className="flex items-center gap-2 border-t border-line px-3 py-2">
              <input
                autoFocus
                aria-label="Link URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="sm">
                Insert link
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLinkOpen(false)}>
                Cancel
              </Button>
            </form>
          )}

          <div
            onMouseDown={(e) => e.preventDefault()}
            className="flex flex-wrap items-center gap-0.5 border-t border-line px-2 py-1 [&_svg]:size-4"
          >
            <IconButton label="Bold" onClick={() => format('bold')} className="size-8">
              <Bold />
            </IconButton>
            <IconButton label="Italic" onClick={() => format('italic')} className="size-8">
              <Italic />
            </IconButton>
            <IconButton label="Underline" onClick={() => format('underline')} className="size-8">
              <Underline />
            </IconButton>
            <span className="mx-1 h-4 w-px bg-line" />
            <IconButton label="Bulleted list" onClick={() => format('insertUnorderedList')} className="size-8">
              <List />
            </IconButton>
            <IconButton label="Numbered list" onClick={() => format('insertOrderedList')} className="size-8">
              <ListOrdered />
            </IconButton>
            <IconButton label="Quote" onClick={() => format('formatBlock', 'blockquote')} className="size-8">
              <Quote />
            </IconButton>
            <IconButton label="Insert link" onClick={openLink} className="size-8">
              <LinkIcon />
            </IconButton>
            <IconButton label="Remove formatting" onClick={() => format('removeFormat')} className="size-8">
              <RemoveFormatting />
            </IconButton>
          </div>

          {error && (
            <p role="alert" className="px-4 pb-1 text-xs text-danger">
              {error}
            </p>
          )}

          <footer className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-2.5">
            <div className="flex items-center">
              <button
                type="button"
                onClick={sendNow}
                className="h-9 rounded-l-full bg-primary pl-5 pr-4 text-sm font-medium text-on-primary shadow-sm transition hover:brightness-110"
              >
                Send
              </button>
              <ScheduleMenu onSchedule={scheduleAt} />
            </div>
            <IconButton label="Attach files" onClick={() => fileRef.current?.click()} className="size-9">
              <Paperclip className="size-[18px]" />
            </IconButton>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="ml-auto" />
            <IconButton label="Discard draft" onClick={discard} className="size-9">
              <Trash className="size-[18px]" />
            </IconButton>
          </footer>
        </>
      )}
    </section>
  );
}
