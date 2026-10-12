import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MdArrowBack,
  MdArrowDropDown,
  MdAttachFile,
  MdClose,
  MdCloseFullscreen,
  MdDateRange,
  MdForward,
  MdInsertLink,
  MdMinimize,
  MdMoreHoriz,
  MdMoreVert,
  MdOpenInFull,
  MdOpenInNew,
  MdOutlineDelete,
  MdOutlineEmojiEmotions,
  MdReply,
  MdReplyAll,
  MdSchedule,
  MdSend,
  MdTextFormat,
} from 'react-icons/md';
import type { Attachment, ComposeMode, DraftFields } from '../../types';
import { useIsMobile } from '../../hooks';
import { replyFields } from '../../lib/compose';
import { closeWindow, me, popOutInline, reopenWindow, saveDraftNow, sendDraft, updateWindow } from '../../lib/composeActions';
import { schedulePresets } from '../../lib/date';
import { currentRoute } from '../../lib/router';
import { cn, escapeHtml, formatSize, htmlToText, isValidEmail, sanitizeHtml, uid } from '../../lib/utils';
import { fileKind } from '../../lib/visuals';
import { MY_EMAIL, useMail } from '../../store/mail';
import { useSettings } from '../../store/settings';
import { confirmDialog, showToast, ui, useUI, type ComposeWin } from '../../store/ui';
import { openDateTime } from '../menus';
import { IconButton, MenuItem, Modal, Popover } from '../ui';
import { EmojiGrid, FormatBar, LinkForm, RecipientField, RichEditor, type EditorHandle } from './Editor';

interface ComposerParams {
  threadId: string;
  draftId: string;
  mode: ComposeMode;
  initial: DraftFields;
  onClosed: () => void;
  reopen: (fields: DraftFields, mode: ComposeMode) => void;
}

const MAX_INLINE_BYTES = 700 * 1024;

function useComposer(p: ComposerParams) {
  const [fields, setFields] = useState<DraftFields>(p.initial);
  const [mode, setMode] = useState<ComposeMode>(p.mode);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>(p.initial.body && useMail.getState().threads[p.threadId]?.messages.some((m) => m.id === p.draftId) ? 'saved' : 'idle');
  const [uploading, setUploading] = useState<string[]>([]);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const closed = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus('saving');
    const id = setTimeout(() => {
      if (closed.current) return;
      const saved = saveDraftNow(p.threadId, p.draftId, fieldsRef.current, modeRef.current);
      setStatus(saved ? 'saved' : 'idle');
    }, 800);
    return () => clearTimeout(id);
  }, [fields, p.threadId, p.draftId]);

  useEffect(
    () => () => {
      if (!closed.current) saveDraftNow(p.threadId, p.draftId, fieldsRef.current, modeRef.current);
    },
    [p.threadId, p.draftId],
  );

  const update = (patch: Partial<DraftFields>) => setFields((f) => ({ ...f, ...patch }));

  const close = () => {
    closed.current = true;
    saveDraftNow(p.threadId, p.draftId, fieldsRef.current, modeRef.current);
    p.onClosed();
  };

  const discard = () => {
    closed.current = true;
    const snap = useMail.getState().snapshot([p.threadId]);
    const f = fieldsRef.current;
    const m = modeRef.current;
    useMail.getState().discardDraft(p.threadId, p.draftId);
    p.onClosed();
    showToast('Draft discarded.', {
      undo: () => {
        useMail.getState().restore(snap);
        p.reopen(f, m);
      },
    });
  };

  const addFiles = async (files: File[]) => {
    const atts: Attachment[] = await Promise.all(
      files.map(
        (file) =>
          new Promise<Attachment>((resolve) => {
            const base: Attachment = { id: uid('att'), name: file.name, size: file.size, type: file.type || 'application/octet-stream' };
            if (file.size > MAX_INLINE_BYTES) return resolve(base);
            const reader = new FileReader();
            reader.onload = () => resolve({ ...base, dataUrl: reader.result as string });
            reader.onerror = () => resolve(base);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setUploading((u) => [...u, ...atts.map((a) => a.id)]);
    setFields((f) => ({ ...f, attachments: [...f.attachments, ...atts] }));
    atts.forEach((a, i) => setTimeout(() => setUploading((u) => u.filter((x) => x !== a.id)), 500 + i * 250 + Math.min(1200, a.size / 20000)));
  };

  const doSend = (scheduledAt?: number) => {
    const f = fieldsRef.current;
    const final: DraftFields = { ...f, body: sanitizeHtml(f.body) };
    closed.current = true;
    const m = modeRef.current;
    sendDraft({ threadId: p.threadId, draftId: p.draftId, fields: final, mode: m, scheduledAt, reopen: () => p.reopen(final, m) });
    p.onClosed();
  };

  const send = (scheduledAt?: number) => {
    const f = fieldsRef.current;
    if (uploading.length) {
      showToast('Please wait for attachments to finish uploading.');
      return;
    }
    const all = [...f.to, ...f.cc, ...f.bcc];
    if (!all.length) {
      confirmDialog({ title: 'Error', message: 'Please specify at least one recipient.', confirmLabel: 'OK', alertOnly: true, onConfirm: () => {} });
      return;
    }
    const bad = all.find((x) => !isValidEmail(x.email));
    if (bad) {
      confirmDialog({
        title: 'Error',
        message: `The address "${bad.email}" was not recognized. Please make sure that all addresses are properly formed.`,
        confirmLabel: 'OK',
        alertOnly: true,
        onConfirm: () => {},
      });
      return;
    }
    const bodyText = htmlToText(f.body.replace(/<div class="(signature|forwarded)">[\s\S]*$/, ''));
    const checks: Array<() => boolean> = [];
    const proceed = (i: number) => {
      if (i >= checks.length) return doSend(scheduledAt);
      if (checks[i]()) proceed(i + 1);
    };
    checks.push(() => {
      if (f.subject.trim()) return true;
      confirmDialog({
        message: bodyText ? 'Send this message without a subject?' : 'Send this message without a subject or text in the body?',
        confirmLabel: 'OK',
        onConfirm: () => proceed(1),
      });
      return false;
    });
    checks.push(() => {
      const hit = f.attachments.length ? null : bodyText.match(/\b(attached|attachments?|attaching|enclosed)\b/i);
      if (!hit) return true;
      confirmDialog({
        title: 'Did you mean to attach files?',
        message: `You wrote “${hit[1].toLowerCase()}” in your message, but there are no files attached. Send anyway?`,
        confirmLabel: 'Send',
        onConfirm: () => proceed(2),
      });
      return false;
    });
    proceed(0);
  };

  const switchMode = (next: ComposeMode) => {
    const t = useMail.getState().threads[p.threadId];
    if (!t || next === mode) return;
    const sig = useSettings.getState().signature;
    const r = replyFields(t, next, MY_EMAIL, sig);
    setMode(next);
    setFields((f) => ({
      ...f,
      to: r.to,
      cc: r.cc,
      subject: r.subject,
      quote: r.quote,
      attachments: next === 'forward' ? r.attachments : f.attachments.filter((a) => a.dataUrl),
      body: next === 'forward' && !f.body.includes('Forwarded message') ? r.body : f.body,
    }));
  };

  return { fields, update, mode, switchMode, status, close, discard, send, addFiles, uploading, setUploading };
}

type Composer = ReturnType<typeof useComposer>;

function AttachmentList({ c }: { c: Composer }) {
  if (!c.fields.attachments.length) return null;
  return (
    <div className="flex flex-col gap-1.5 py-2">
      {c.fields.attachments.map((a) => {
        const k = fileKind(a.name, a.type);
        const loading = c.uploading.includes(a.id);
        return (
          <div key={a.id} className="relative flex h-9 max-w-md items-center gap-2 overflow-hidden rounded bg-chip px-3 text-sm">
            <k.icon size={18} style={{ color: k.color }} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium text-accent-text">{a.name}</span>
            <span className="shrink-0 text-xs text-fg3">({formatSize(a.size)})</span>
            <button
              type="button"
              aria-label={`Remove ${a.name}`}
              onClick={() => c.update({ attachments: c.fields.attachments.filter((x) => x.id !== a.id) })}
              className="flex size-6 items-center justify-center rounded-full text-fg3 hover:bg-hover"
            >
              <MdClose size={16} />
            </button>
            {loading && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-line" role="progressbar" aria-label={`Uploading ${a.name}`}>
                <span className="block h-full w-1/2 animate-pulse bg-accent" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (ts: number) => void }) {
  const presets = schedulePresets();
  return (
    <Modal open={open} onClose={onClose} label="Schedule send" className="max-w-sm py-4">
      <h2 className="px-6 pb-2 text-lg text-fg">Schedule send</h2>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            onClose();
            onPick(p.at);
          }}
          className="flex w-full items-center justify-between px-6 py-2.5 text-left text-sm hover:bg-hover"
        >
          <span className="text-fg">{p.label}</span>
          <span className="text-fg3">{p.detail}</span>
        </button>
      ))}
      <div className="my-1 h-px bg-line" />
      <button
        type="button"
        onClick={() => {
          onClose();
          openDateTime({ title: 'Pick date & time', confirmLabel: 'Schedule send', onPick });
        }}
        className="flex w-full items-center gap-3 px-6 py-2.5 text-left text-sm text-fg hover:bg-hover"
      >
        <MdDateRange size={20} className="text-fg2" /> Pick date &amp; time
      </button>
    </Modal>
  );
}

function BottomBar({ c, editor, onPopOut, compact }: { c: Composer; editor: React.RefObject<EditorHandle | null>; onPopOut?: () => void; compact?: boolean }) {
  const [showFormat, setShowFormat] = useState(false);
  const [sendMenu, setSendMenu] = useState<HTMLElement | null>(null);
  const [schedule, setSchedule] = useState(false);
  const [linkAnchor, setLinkAnchor] = useState<HTMLElement | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [linkText, setLinkText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="shrink-0">
      {showFormat && (
        <div className="pb-2">
          <FormatBar editor={editor} />
        </div>
      )}
      <div className="flex items-center gap-1">
        <div className="flex h-9 shrink-0 overflow-hidden rounded-full bg-accent text-accent-fg">
          <button type="button" onClick={() => c.send()} className="pr-4 pl-5 text-sm font-medium hover:bg-black/10" data-tip="Send (⌘Enter)">
            Send
          </button>
          <span className="my-2 w-px bg-accent-fg/30" />
          <button type="button" aria-label="More send options" data-tip="More send options" onClick={(e) => setSendMenu(e.currentTarget)} className="px-1.5 hover:bg-black/10">
            <MdArrowDropDown size={20} />
          </button>
        </div>
        <Popover open={!!sendMenu} anchor={sendMenu} onClose={() => setSendMenu(null)} placement="top-start">
          <MenuItem
            icon={MdSchedule}
            label="Schedule send"
            onClick={() => {
              setSendMenu(null);
              setSchedule(true);
            }}
          />
        </Popover>
        <ScheduleDialog open={schedule} onClose={() => setSchedule(false)} onPick={(ts) => c.send(ts)} />
        <div className={cn('ml-1 flex min-w-0 items-center', compact ? 'gap-0' : 'gap-0.5')}>
          <IconButton icon={MdTextFormat} label="Formatting options" size="sm" active={showFormat} onClick={() => setShowFormat((s) => !s)} />
          <IconButton icon={MdAttachFile} label="Attach files" size="sm" onClick={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) c.addFiles(files);
              e.target.value = '';
            }}
          />
          <IconButton
            icon={MdInsertLink}
            label="Insert link"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.current?.saveSelection();
              setLinkText(window.getSelection()?.toString() ?? '');
            }}
            onClick={(e) => setLinkAnchor(e.currentTarget)}
          />
          <IconButton
            icon={MdOutlineEmojiEmotions}
            label="Insert emoji"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.current?.saveSelection();
            }}
            onClick={(e) => setEmojiAnchor(e.currentTarget)}
          />
          {onPopOut && <IconButton icon={MdOpenInNew} label="Pop out reply" size="sm" onClick={onPopOut} />}
        </div>
        <Popover open={!!linkAnchor} anchor={linkAnchor} onClose={() => setLinkAnchor(null)} placement="top-start" role="dialog">
          <LinkForm
            initialText={linkText}
            onCancel={() => setLinkAnchor(null)}
            onSubmit={(text, url) => {
              setLinkAnchor(null);
              editor.current?.insertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>&nbsp;`);
            }}
          />
        </Popover>
        <Popover open={!!emojiAnchor} anchor={emojiAnchor} onClose={() => setEmojiAnchor(null)} placement="top-start">
          <EmojiGrid
            onPick={(e) => {
              editor.current?.insertHtml(e);
              editor.current?.saveSelection();
            }}
          />
        </Popover>
        <div className="flex-1" />
        <span className="hidden truncate pr-1 text-xs text-fg3 sm:inline" aria-live="polite">
          {c.status === 'saving' ? 'Saving…' : c.status === 'saved' ? 'Draft saved' : ''}
        </span>
        <IconButton icon={MdOutlineDelete} label="Discard draft" size="sm" onClick={c.discard} />
      </div>
    </div>
  );
}

function useDropFiles(c: Composer) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      },
      onDrop: (e: React.DragEvent) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        c.addFiles(Array.from(e.dataTransfer.files));
      },
    },
  };
}

function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] border-2 border-dashed border-accent bg-accent-soft/80 text-base font-medium text-fg">
      Drop files here
    </div>
  );
}

function sendShortcut(c: Composer) {
  return (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      c.send();
    }
  };
}

function reopenAsWindow(win: Omit<ComposeWin, 'id'>) {
  return (fields: DraftFields, mode: ComposeMode) => reopenWindow({ ...win, initial: fields, mode, focus: 'body' });
}

function ComposeWindow({ win, index, total }: { win: ComposeWin; index: number; total: number }) {
  const isMobile = useIsMobile();
  const c = useComposer({
    threadId: win.threadId,
    draftId: win.draftId,
    mode: win.mode,
    initial: win.initial,
    onClosed: () => closeWindow(win.id),
    reopen: reopenAsWindow(win),
  });
  const editor = useRef<EditorHandle>(null);
  const [showCc, setShowCc] = useState(win.initial.cc.length > 0);
  const [showBcc, setShowBcc] = useState(win.initial.bcc.length > 0);
  const [recipientsOpen, setRecipientsOpen] = useState(win.focus === 'to' || !win.initial.to.length);
  const drop = useDropFiles(c);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const title = c.fields.subject.trim() || (win.mode === 'new' ? 'New Message' : win.mode === 'forward' ? 'Forward' : 'Reply');

  const recipients = recipientsOpen ? (
    <>
      <RecipientField
        label="To"
        value={c.fields.to}
        onChange={(to) => c.update({ to })}
        autoFocus={win.focus === 'to'}
        inputId={`${win.id}-to`}
        trailing={
          <span className="ml-auto flex gap-2 pl-2 text-sm text-fg2">
            {!showCc && (
              <button type="button" className="hover:underline" onClick={() => setShowCc(true)}>
                Cc
              </button>
            )}
            {!showBcc && (
              <button type="button" className="hover:underline" onClick={() => setShowBcc(true)}>
                Bcc
              </button>
            )}
          </span>
        }
      />
      {showCc && <RecipientField label="Cc" value={c.fields.cc} onChange={(cc) => c.update({ cc })} autoFocus={showCc && !win.initial.cc.length} />}
      {showBcc && <RecipientField label="Bcc" value={c.fields.bcc} onChange={(bcc) => c.update({ bcc })} autoFocus={showBcc && !win.initial.bcc.length} />}
    </>
  ) : (
    <button type="button" onClick={() => setRecipientsOpen(true)} className="flex h-10 w-full items-center border-b border-line text-left text-sm">
      <span className="truncate text-fg">{[...c.fields.to, ...c.fields.cc, ...c.fields.bcc].map((x) => x.name || x.email).join(', ') || <span className="text-fg3">Recipients</span>}</span>
    </button>
  );

  const body = (
    <>
      <div className="px-4" onFocus={(e) => e.target instanceof HTMLInputElement && e.target.id?.includes('subject') && setRecipientsOpen(false)}>
        {recipients}
        <input
          id={`${win.id}-subject`}
          value={c.fields.subject}
          onChange={(e) => c.update({ subject: e.target.value })}
          placeholder="Subject"
          aria-label="Subject"
          autoFocus={win.focus === 'subject'}
          onFocus={() => c.fields.to.length && setRecipientsOpen(false)}
          className="h-10 w-full border-b border-line bg-transparent text-sm text-fg outline-none placeholder:text-fg3"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3" onClick={(e) => e.target === e.currentTarget && editor.current?.focus(true)} onFocus={() => c.fields.to.length && setRecipientsOpen(false)}>
        <RichEditor
          ref={editor}
          initialHtml={win.initial.body}
          onChange={(bodyHtml) => c.update({ body: bodyHtml })}
          autoFocus={win.focus === 'body'}
          onKeyDown={sendShortcut(c)}
          onFiles={c.addFiles}
          className="min-h-[160px] pb-4"
        />
        {c.fields.quote && (
          <div className="pb-3">
            <QuoteToggle html={c.fields.quote} />
          </div>
        )}
        <AttachmentList c={c} />
      </div>
    </>
  );

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[55] flex animate-slide-up flex-col bg-panel" {...drop.props} role="dialog" aria-label={title} onKeyDown={(e) => e.stopPropagation()}>
        {drop.over && <DropOverlay />}
        <div className="flex h-14 shrink-0 items-center gap-1 px-1">
          <IconButton icon={MdArrowBack} label="Save & close" onClick={c.close} />
          <span className="flex-1 truncate pl-1 text-lg text-fg">{win.mode === 'new' ? 'Compose' : title}</span>
          <IconButton icon={MdAttachFile} label="Attach files" onClick={() => document.getElementById(`${win.id}-file`)?.click()} />
          <input
            id={`${win.id}-file`}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) c.addFiles(files);
              e.target.value = '';
            }}
          />
          <IconButton icon={MdSend} label="Send" onClick={() => c.send()} className="text-accent-text" />
          <IconButton icon={MdMoreVert} label="More options" onClick={(e) => setMoreAnchor(e.currentTarget)} />
          <Popover open={!!moreAnchor} anchor={moreAnchor} onClose={() => setMoreAnchor(null)} placement="bottom-end">
            <div className="w-52">
              <MobileScheduleItem c={c} close={() => setMoreAnchor(null)} />
              <MenuItem icon={MdOutlineDelete} label="Discard" onClick={() => { setMoreAnchor(null); c.discard(); }} />
            </div>
          </Popover>
        </div>
        <div className="flex h-10 items-center border-b border-line px-4 text-sm">
          <span className="mr-3 text-fg3">From</span>
          <span className="truncate text-fg">{me().name} &lt;{MY_EMAIL}&gt;</span>
        </div>
        {body}
      </div>,
      document.body,
    );
  }

  const width = win.minimized ? 280 : 540;
  const right = 16 + (total - 1 - index) * (win.minimized ? 296 : 556);
  const style = win.maximized ? undefined : { width, right };

  const panel = (
    <div
      role="dialog"
      aria-label={title}
      {...drop.props}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          c.close();
        }
      }}
      className={cn(
        'pointer-events-auto flex flex-col overflow-hidden bg-raised shadow-e2',
        win.maximized ? 'relative h-[min(88vh,900px)] w-[min(92vw,1100px)] animate-pop rounded-2xl' : 'fixed bottom-0 animate-slide-up rounded-t-xl',
        !win.maximized && !win.minimized && 'h-[min(600px,calc(100vh-88px))]',
      )}
      style={style}
    >
      {drop.over && <DropOverlay />}
      <div
        className="flex h-10 shrink-0 cursor-pointer items-center gap-1 bg-search pr-2 pl-4 dark:bg-[#34363a]"
        onClick={() => updateWindow(win.id, { minimized: !win.minimized, maximized: false })}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{title}</span>
        <IconButton icon={MdMinimize} label={win.minimized ? 'Expand' : 'Minimize'} size="sm" onClick={(e) => { e.stopPropagation(); updateWindow(win.id, { minimized: !win.minimized, maximized: false }); }} />
        <IconButton
          icon={win.maximized ? MdCloseFullscreen : MdOpenInFull}
          label={win.maximized ? 'Exit full screen' : 'Full screen'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            updateWindow(win.id, { maximized: !win.maximized, minimized: false });
          }}
        />
        <IconButton icon={MdClose} label="Save & close" size="sm" onClick={(e) => { e.stopPropagation(); c.close(); }} />
      </div>
      {!win.minimized && (
        <>
          {body}
          <div className="px-4 pt-1 pb-3">
            <BottomBar c={c} editor={editor} />
          </div>
        </>
      )}
    </div>
  );

  if (win.maximized) {
    return createPortal(
      <div className="fixed inset-0 z-[55] flex animate-fade items-center justify-center bg-scrim" onPointerDown={(e) => e.target === e.currentTarget && updateWindow(win.id, { maximized: false })}>
        {panel}
      </div>,
      document.body,
    );
  }
  return panel;
}

function MobileScheduleItem({ c, close }: { c: Composer; close: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuItem
        icon={MdSchedule}
        label="Schedule send"
        onClick={() => {
          setOpen(true);
        }}
      />
      <ScheduleDialog
        open={open}
        onClose={() => {
          setOpen(false);
          close();
        }}
        onPick={(ts) => c.send(ts)}
      />
    </>
  );
}

function QuoteToggle({ html }: { html: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" aria-label={open ? 'Hide trimmed content' : 'Show trimmed content'} data-tip={open ? 'Hide trimmed content' : 'Show trimmed content'} onClick={() => setOpen((o) => !o)} className="flex h-4 items-center rounded-sm bg-chip px-1 text-fg2 hover:bg-hover">
        <MdMoreHoriz size={18} />
      </button>
      {open && <div className="mail-body mt-2 text-sm opacity-80" dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}

export function ComposeDock() {
  const composes = useUI((s) => s.composes);
  if (!composes.length) return null;
  return (
    <div className="print-hide pointer-events-none fixed inset-x-0 bottom-0 z-[45]">
      {composes.map((w, i) => (
        <ComposeWindow key={w.id} win={w} index={i} total={composes.length} />
      ))}
    </div>
  );
}

const MODE_META: Record<ComposeMode, { icon: typeof MdReply; label: string }> = {
  new: { icon: MdReply, label: 'Reply' },
  reply: { icon: MdReply, label: 'Reply' },
  replyAll: { icon: MdReplyAll, label: 'Reply all' },
  forward: { icon: MdForward, label: 'Forward' },
};

export function InlineComposer({ threadId }: { threadId: string }) {
  const inline = useUI((s) => s.inline);
  if (!inline || inline.threadId !== threadId) return null;
  return <InlineComposerInner key={inline.key} inline={inline} />;
}

function InlineComposerInner({ inline }: { inline: NonNullable<ReturnType<typeof useUI.getState>['inline']> }) {
  const c = useComposer({
    threadId: inline.threadId,
    draftId: inline.draftId,
    mode: inline.mode,
    initial: inline.initial,
    onClosed: () => ui.set({ inline: null }),
    reopen: (fields, mode) => {
      const r = currentRoute();
      if (r.view !== 'settings' && r.threadId === inline.threadId) ui.set({ inline: { ...inline, initial: fields, mode, key: uid('ir') } });
      else reopenWindow({ threadId: inline.threadId, draftId: inline.draftId, mode, isNewThread: false, minimized: false, maximized: false, initial: fields, focus: 'body' });
    },
  });
  const editor = useRef<EditorHandle>(null);
  const [editingRecipients, setEditingRecipients] = useState(inline.mode === 'forward' || !inline.initial.to.length);
  const [showCc, setShowCc] = useState(inline.initial.cc.length > 0);
  const [modeMenu, setModeMenu] = useState<HTMLElement | null>(null);
  const drop = useDropFiles(c);
  const ref = useRef<HTMLDivElement>(null);
  const thread = useMail((s) => s.threads[inline.threadId]);
  const Meta = MODE_META[c.mode];

  useEffect(() => {
    if (!inline.passive) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (c.mode === 'forward') setEditingRecipients(true);
  }, [c.mode]);

  const multi = thread ? new Set(thread.messages.flatMap((m) => [m.from.email, ...m.to.map((x) => x.email), ...m.cc.map((x) => x.email)]).filter((e) => e !== MY_EMAIL)).size > 1 : false;

  return (
    <div
      ref={ref}
      {...drop.props}
      className="relative my-4 rounded-2xl bg-raised shadow-e2 ring-1 ring-line md:ml-[52px]"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          c.close();
        }
      }}
      data-testid="inline-composer"
    >
      {drop.over && <DropOverlay />}
      <div className="flex items-center gap-1 px-2 pt-2">
        <button type="button" onClick={(e) => setModeMenu(e.currentTarget)} className="flex h-8 items-center rounded px-1 text-fg2 hover:bg-hover" aria-label="Type of response" data-tip="Type of response">
          <Meta.icon size={18} />
          <MdArrowDropDown size={18} />
        </button>
        <Popover open={!!modeMenu} anchor={modeMenu} onClose={() => setModeMenu(null)}>
          <div className="w-56">
            <MenuItem icon={MdReply} label="Reply" onClick={() => { setModeMenu(null); c.switchMode('reply'); }} />
            {multi && <MenuItem icon={MdReplyAll} label="Reply to all" onClick={() => { setModeMenu(null); c.switchMode('replyAll'); }} />}
            <MenuItem icon={MdForward} label="Forward" onClick={() => { setModeMenu(null); c.switchMode('forward'); }} />
            <MenuItem icon={MdOpenInNew} label="Pop out reply" onClick={() => { setModeMenu(null); popOutInline(c.fields); }} />
          </div>
        </Popover>
        {!editingRecipients ? (
          <button type="button" onClick={() => setEditingRecipients(true)} className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-sm text-fg hover:bg-hover">
            {[...c.fields.to, ...c.fields.cc].map((x) => x.name || x.email).join(', ')}
          </button>
        ) : (
          <div className="min-w-0 flex-1 pr-2">
            <RecipientField
              label="To"
              value={c.fields.to}
              onChange={(to) => c.update({ to })}
              autoFocus={!inline.passive}
              trailing={
                !showCc && (
                  <button type="button" className="ml-auto pl-2 text-sm text-fg2 hover:underline" onClick={() => setShowCc(true)}>
                    Cc
                  </button>
                )
              }
            />
            {showCc && <RecipientField label="Cc" value={c.fields.cc} onChange={(cc) => c.update({ cc })} />}
          </div>
        )}
      </div>
      <div className="px-4 pt-2">
        <RichEditor ref={editor} initialHtml={inline.initial.body} onChange={(b) => c.update({ body: b })} autoFocus={!inline.passive && !editingRecipients} onKeyDown={sendShortcut(c)} onFiles={c.addFiles} className="min-h-[120px] pb-3" />
        {c.fields.quote && (
          <div className="pb-2">
            <QuoteToggle html={c.fields.quote} />
          </div>
        )}
        <AttachmentList c={c} />
      </div>
      <div className="px-4 pt-1 pb-3">
        <BottomBar c={c} editor={editor} onPopOut={() => popOutInline(c.fields)} />
      </div>
    </div>
  );
}