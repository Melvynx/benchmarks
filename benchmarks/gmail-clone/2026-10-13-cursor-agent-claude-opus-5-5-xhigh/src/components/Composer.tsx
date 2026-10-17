import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Popover } from "radix-ui";
import { useMail, getMail } from "../lib/store";
import { ui, type ComposerWin } from "../lib/ui";
import { actions } from "../lib/actions";
import { navigate } from "../lib/router";
import { scheduleOptions } from "../lib/date";
import { storeUpload, removeUpload } from "../lib/files";
import { sanitize } from "../lib/html";
import type { Address, Attachment } from "../lib/types";
import { cn, formatBytes, kindFromName, uid } from "../lib/utils";
import { Button, Dialog, Icon, IconButton, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Tip, type IconKey } from "./ui";
import { RecipientField } from "./RecipientField";
import { SnoozeCustomDialog } from "./ThreadActions";
import { KIND_ICON } from "./attachmentMeta";

const MAX_BYTES = 25 * 1024 * 1024;
const EMOJI = "😀 😂 🥹 😊 😍 🤩 😎 🤔 😅 😭 😴 🙃 😬 🥳 🤯 👍 👎 👏 🙌 🙏 💪 👀 🤝 ✌️ 👋 ❤️ 🧡 💛 💚 💙 💜 🔥 ✨ 🎉 🎂 🌮 🍕 ☕ 🍷 🌊 🌲 ☀️ 🌙 ⭐ 🚀 ✈️ 🚗 🏠 📎 📅 ✅ ❌ ⚠️ 💡 📌 📈 💰 🎯 🦃".split(" ");
const COLORS = ["#202124", "#5f6368", "#d93025", "#e37400", "#f9ab00", "#188038", "#1a73e8", "#9334e6", "#c5221f", "#b06000", "#0d652d", "#174ea6"];

export async function filesToAttachments(files: FileList | File[]) {
  const out: Attachment[] = [];
  for (const f of Array.from(files)) {
    if (f.size > MAX_BYTES) {
      ui().set({ alert: { title: "Large files", body: `“${f.name}” is ${formatBytes(f.size)}. Attachments are limited to 25 MB.` } });
      continue;
    }
    const key = uid("blob");
    await storeUpload(key, f);
    out.push({ id: uid("att"), name: f.name, size: f.size, mime: f.type, kind: kindFromName(f.name, f.type), blobKey: key });
  }
  return out;
}

function ToolBtn({ icon, label, active, onClick, disabled }: { icon: IconKey; label: string; active?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <Tip label={label} side="top">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded text-icon hover:bg-hover disabled:opacity-35", active && "bg-hover-strong text-fg")}
      >
        <Icon name={icon} size={18} />
      </button>
    </Tip>
  );
}

function FormatBar({ editor }: { editor: Editor }) {
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      undo: e.can().undo(),
      redo: e.can().redo(),
      size: (e.getAttributes("textStyle").fontSize as string | undefined) || "",
    }),
  });
  const c = () => editor.chain().focus();
  const sep = <span className="mx-1 h-5 w-px shrink-0 bg-line" />;
  const align = st.center ? "format_align_center" : st.right ? "format_align_right" : "format_align_left";
  return (
    <div className="no-scrollbar mx-3 mb-1 flex items-center gap-0.5 overflow-x-auto rounded-lg bg-surface-2 px-1.5 py-1 shadow-e1" role="toolbar" aria-label="Formatting options">
      <ToolBtn icon="undo" label="Undo (⌘Z)" disabled={!st.undo} onClick={() => c().undo().run()} />
      <ToolBtn icon="redo" label="Redo (⌘Y)" disabled={!st.redo} onClick={() => c().redo().run()} />
      {sep}
      <Menu>
        <Tip label="Size" side="top">
          <MenuTrigger asChild>
            <button type="button" aria-label="Font size" onMouseDown={(e) => e.preventDefault()} className="inline-flex h-7 shrink-0 items-center rounded px-1 text-icon hover:bg-hover">
              <Icon name="format_size" size={18} />
              <Icon name="arrow_drop_down" size={16} />
            </button>
          </MenuTrigger>
        </Tip>
        <MenuContent side="top" onCloseAutoFocus={(e) => e.preventDefault()}>
          {[["12px", "Small"], ["", "Normal"], ["18px", "Large"], ["26px", "Huge"]].map(([v, l]) => (
            <MenuItem key={l} icon={st.size === v ? "check" : undefined} className={st.size === v ? "" : "pl-[52px]"} onSelect={() => (v ? c().setFontSize(v).run() : c().unsetFontSize().run())}>
              <span style={{ fontSize: v || "14px" }}>{l}</span>
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
      {sep}
      <ToolBtn icon="format_bold" label="Bold (⌘B)" active={st.bold} onClick={() => c().toggleBold().run()} />
      <ToolBtn icon="format_italic" label="Italic (⌘I)" active={st.italic} onClick={() => c().toggleItalic().run()} />
      <ToolBtn icon="format_underlined" label="Underline (⌘U)" active={st.underline} onClick={() => c().toggleUnderline().run()} />
      <Popover.Root>
        <Tip label="Text color" side="top">
          <Popover.Trigger asChild>
            <button type="button" aria-label="Text color" onMouseDown={(e) => e.preventDefault()} className="inline-flex h-7 shrink-0 items-center rounded px-1 text-icon hover:bg-hover">
              <Icon name="format_color_text" size={18} />
              <Icon name="arrow_drop_down" size={16} />
            </button>
          </Popover.Trigger>
        </Tip>
        <Popover.Portal>
          <Popover.Content side="top" sideOffset={6} onOpenAutoFocus={(e) => e.preventDefault()} className="no-print z-[90] grid grid-cols-6 gap-1.5 rounded-lg bg-menu p-3 shadow-e2 animate-pop">
            {COLORS.map((col) => (
              <button key={col} type="button" aria-label={`Color ${col}`} onClick={() => c().setColor(col).run()} className="size-6 rounded-full ring-offset-1 hover:ring-2 hover:ring-outline" style={{ background: col }} />
            ))}
            <button type="button" onClick={() => c().unsetColor().run()} className="col-span-6 mt-1 rounded py-1 font-sans text-xs text-fg-2 hover:bg-hover">Default color</button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {sep}
      <Menu>
        <Tip label="Align" side="top">
          <MenuTrigger asChild>
            <button type="button" aria-label="Align" onMouseDown={(e) => e.preventDefault()} className="inline-flex h-7 shrink-0 items-center rounded px-1 text-icon hover:bg-hover">
              <Icon name={align} size={18} />
              <Icon name="arrow_drop_down" size={16} />
            </button>
          </MenuTrigger>
        </Tip>
        <MenuContent side="top" className="min-w-0" onCloseAutoFocus={(e) => e.preventDefault()}>
          <div className="flex px-2">
            <ToolBtn icon="format_align_left" label="Align left" active={st.left} onClick={() => c().setTextAlign("left").run()} />
            <ToolBtn icon="format_align_center" label="Align center" active={st.center} onClick={() => c().setTextAlign("center").run()} />
            <ToolBtn icon="format_align_right" label="Align right" active={st.right} onClick={() => c().setTextAlign("right").run()} />
          </div>
        </MenuContent>
      </Menu>
      <ToolBtn icon="format_list_numbered" label="Numbered list" active={st.ordered} onClick={() => c().toggleOrderedList().run()} />
      <ToolBtn icon="format_list_bulleted" label="Bulleted list" active={st.bullet} onClick={() => c().toggleBulletList().run()} />
      <ToolBtn icon="format_indent_decrease" label="Indent less" onClick={() => c().liftListItem("listItem").run()} />
      <ToolBtn icon="format_indent_increase" label="Indent more" onClick={() => c().sinkListItem("listItem").run()} />
      <ToolBtn icon="format_quote" label="Quote" active={st.quote} onClick={() => c().toggleBlockquote().run()} />
      <ToolBtn icon="format_strikethrough" label="Strikethrough" active={st.strike} onClick={() => c().toggleStrike().run()} />
      <ToolBtn icon="format_clear" label="Remove formatting" onClick={() => c().unsetAllMarks().clearNodes().run()} />
    </div>
  );
}

function EmojiButton({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label="Insert emoji" side="top">
        <Popover.Trigger asChild>
          <button type="button" aria-label="Insert emoji" onMouseDown={(e) => e.preventDefault()} className="inline-flex size-9 items-center justify-center rounded-full text-icon hover:bg-hover">
            <Icon name="mood" size={20} />
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content side="top" sideOffset={6} collisionPadding={8} onOpenAutoFocus={(e) => e.preventDefault()} className="no-print z-[90] w-[296px] rounded-xl bg-menu p-2 shadow-e2 animate-pop">
          <div className="px-1 pb-1 font-sans text-xs font-medium text-fg-3">Frequently used</div>
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI.map((e) => (
              <button key={e} type="button" onClick={() => (onPick(e), setOpen(false))} className="inline-flex size-8 items-center justify-center rounded-md text-xl hover:bg-hover">
                {e}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function LinkDialog({ open, onOpenChange, editor }: { open: boolean; onOpenChange: (v: boolean) => void; editor: Editor | null }) {
  const [text, setText] = useState("");
  const [href, setHref] = useState("");
  useEffect(() => {
    if (!open || !editor) return;
    const { from, to } = editor.state.selection;
    setText(editor.state.doc.textBetween(from, to, " "));
    setHref((editor.getAttributes("link").href as string) || "");
  }, [open, editor]);
  const apply = () => {
    if (!editor || !href.trim()) return;
    const url = /^(https?:|mailto:)/i.test(href) ? href.trim() : `https://${href.trim()}`;
    const { from, to } = editor.state.selection;
    if (from === to || editor.state.doc.textBetween(from, to, " ") !== text) {
      editor.chain().focus().insertContent({ type: "text", text: text || url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit link"
      footer={
        <>
          {editor?.isActive("link") && <Button variant="text" onClick={() => (editor.chain().focus().unsetLink().run(), onOpenChange(false))}>Remove</Button>}
          <Button variant="text" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply} disabled={!href.trim()}>OK</Button>
        </>
      }
    >
      <form onSubmit={(e) => (e.preventDefault(), apply())} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs text-fg-2">
          Text to display
          <input value={text} onChange={(e) => setText(e.target.value)} className="h-10 rounded-md border border-outline bg-transparent px-3 text-sm text-fg outline-none focus:border-2 focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-fg-2">
          Web address or email
          <input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://" className="h-10 rounded-md border border-outline bg-transparent px-3 text-sm text-fg outline-none focus:border-2 focus:border-primary" />
        </label>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

export function ScheduleDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (t: number) => void }) {
  const [custom, setCustom] = useState(false);
  const opts = useMemo(() => (open ? scheduleOptions() : []), [open]);
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title={<span className="block px-6">Schedule send</span>} className="w-[min(92vw,400px)] px-0 pb-3" footer={null}>
        <div className="-mt-1">
          {opts.map((o) => (
            <button key={o.id} type="button" onClick={() => (onPick(o.at), onOpenChange(false))} className="flex h-12 w-full items-center justify-between px-6 text-left font-sans text-sm hover:bg-hover">
              <span>{o.label}</span>
              <span className="text-fg-3">{o.detail}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button type="button" onClick={() => (onOpenChange(false), setCustom(true))} className="flex h-12 w-full items-center gap-4 px-6 text-left font-sans text-sm hover:bg-hover">
            <Icon name="date_range" size={20} className="text-icon" />
            Pick date &amp; time
          </button>
        </div>
      </Dialog>
      <SnoozeCustomDialog open={custom} onOpenChange={setCustom} onPick={onPick} title="Pick date & time" confirm="Schedule send" />
    </>
  );
}

type Variant = "floating" | "inline" | "mobile";

export function Composer({ id, variant, win }: { id: string; variant: Variant; win?: ComposerWin }) {
  const msg = useMail((s) => s.messages[id]);
  const account = useMail((s) => s.account);
  const settings = useMail((s) => s.settings);
  const orig = useMail((s) => (msg?.inReplyTo ? s.messages[msg.inReplyTo] : undefined));
  const [to, setTo] = useState<Address[]>(() => msg?.to ?? []);
  const [cc, setCc] = useState<Address[]>(() => msg?.cc ?? []);
  const [bcc, setBcc] = useState<Address[]>(() => msg?.bcc ?? []);
  const [subject, setSubject] = useState(() => msg?.subject ?? "");
  const [showCc, setShowCc] = useState(() => !!msg?.cc.length);
  const [showBcc, setShowBcc] = useState(() => !!msg?.bcc.length);
  const [formatting, setFormatting] = useState(variant !== "mobile");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showQuoted, setShowQuoted] = useState(msg?.replyKind === "forward");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [spell, setSpell] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  const savedFields = useRef(JSON.stringify({ to, cc, bcc, subject }));
  const latest = useRef({ to, cc, bcc, subject });
  latest.current = { to, cc, bcc, subject };
  const editorRef = useRef<Editor | null>(null);

  const save = useCallback(() => {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    const m = getMail().messages[id];
    if (!m || m.status !== "draft") return;
    getMail().updateDraft(id, { ...latest.current, html: editorRef.current?.getHTML() ?? m.html });
    setStatus("saved");
  }, [id]);

  const touch = useCallback(() => {
    dirty.current = true;
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(save, 700);
  }, [save]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({ link: { openOnClick: false, autolink: true, defaultProtocol: "https" }, heading: false, codeBlock: false }),
      Placeholder.configure({ placeholder: variant === "mobile" ? "Compose email" : "" }),
      TextAlign.configure({ types: ["paragraph"] }),
      TextStyle,
      Color,
      FontSize,
    ],
    [variant],
  );

  const editor = useEditor({
    extensions,
    content: msg?.html || "<p></p>",
    onUpdate: () => touch(),
    editorProps: {
      attributes: { "aria-label": "Message Body", role: "textbox", "aria-multiline": "true" },
      handleDrop: (_view, event) => {
        const files = (event as DragEvent).dataTransfer?.files;
        if (files?.length) {
          addFiles(files);
          return true;
        }
        return false;
      },
    },
  });
  editorRef.current = editor;

  useEffect(() => {
    const json = JSON.stringify({ to, cc, bcc, subject });
    if (json === savedFields.current) return;
    savedFields.current = json;
    touch();
  }, [to, cc, bcc, subject, touch]);

  useEffect(() => () => save(), [save]);

  useEffect(() => {
    if (!editor) return;
    const t = setTimeout(() => {
      if (variant !== "inline" && !to.length && msg?.replyKind !== "reply" && msg?.replyKind !== "replyAll") {
        document.querySelector<HTMLInputElement>(`[data-composer="${id}"] input[aria-label="To"]`)?.focus();
      } else editor.commands.focus("start");
    }, 30);
    return () => clearTimeout(t);
    // focus when (re)opened
  }, [editor, win?.focusNonce]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    try {
      editor.view.dom.setAttribute("spellcheck", String(spell));
    } catch {
      // The view only exists once EditorContent has mounted.
    }
  }, [spell, editor]);

  const addFiles = async (files: FileList | File[]) => {
    const atts = await filesToAttachments(files);
    if (!atts.length) return;
    const m = getMail().messages[id];
    if (!m) return;
    getMail().updateDraft(id, { attachments: [...m.attachments, ...atts] });
    setStatus("saved");
  };

  const removeAttachment = (a: Attachment) => {
    const m = getMail().messages[id];
    if (!m) return;
    getMail().updateDraft(id, { attachments: m.attachments.filter((x) => x.id !== a.id) });
    if (a.blobKey && !Object.values(getMail().messages).some((mm) => mm.id !== id && mm.attachments.some((x) => x.blobKey === a.blobKey))) removeUpload(a.blobKey);
  };

  const bodyText = () => (editor?.getText() || "").trim();
  const isEmpty = () => !to.length && !cc.length && !bcc.length && !subject.trim() && !bodyText() && !(msg?.attachments.length);

  const close = () => {
    if (variant !== "inline" && isEmpty() && msg?.replyKind === "new") {
      clearTimeout(timer.current);
      dirty.current = false;
      ui().closeComposer(id);
      getMail().discardDraft(id);
      return;
    }
    save();
    ui().closeComposer(id);
    if (msg?.status === "draft") ui().showToast({ message: "Draft saved.", actions: [{ label: "View", run: () => navigate("drafts") }] });
  };

  const doSend = (scheduledAt?: number) => {
    dirty.current = true;
    save();
    const err = actions.validateDraft(id);
    if (err) {
      ui().set({ alert: { title: "Error", body: err } });
      return;
    }
    const go = () => actions.send(id, scheduledAt);
    if (!subject.trim() && !bodyText()) {
      ui().set({ confirm: { title: "Send without a subject?", body: "Send this message without a subject or text in the body?", confirmLabel: "Send", onConfirm: go } });
      return;
    }
    go();
  };

  const send = (scheduledAt?: number) => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setTimeout(() => doSend(scheduledAt), 0);
  };

  const switchKind = (kind: "reply" | "replyAll" | "forward") => {
    if (!msg?.inReplyTo || kind === msg.replyKind) return;
    const html = editor?.getHTML() || "";
    dirty.current = false;
    clearTimeout(timer.current);
    const nid = getMail().createDraft({ kind, messageId: msg.inReplyTo });
    getMail().updateDraft(nid, { html, attachments: kind === "forward" ? getMail().messages[nid].attachments : msg.attachments });
    getMail().deleteMessage(id);
    if (variant !== "inline") {
      ui().closeComposer(id);
      ui().openComposer(nid);
    } else ui().set({ revealMessage: nid });
  };

  const popOut = () => {
    dirty.current = true;
    save();
    ui().openComposer(id);
  };

  if (!msg) return null;
  const title = subject.trim() || (msg.replyKind === "new" ? "New Message" : "Draft");
  const minimized = win?.minimized;
  const maximized = win?.maximized;
  const atts = msg.attachments;
  const quotedHtml = msg.quoted ? sanitize(msg.quoted) : "";

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    } else if (e.key === "Escape" && variant === "floating" && !e.nativeEvent.defaultPrevented) {
      e.preventDefault();
      close();
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setShowCc(true);
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      setShowBcc(true);
    }
  };

  const ccToggles = (
    <span className="ml-auto flex shrink-0 gap-2 pl-2 font-body text-sm text-fg-2">
      {!showCc && (
        <button type="button" onClick={() => setShowCc(true)} className="hover:underline">
          Cc
        </button>
      )}
      {!showBcc && (
        <button type="button" onClick={() => setShowBcc(true)} className="hover:underline">
          Bcc
        </button>
      )}
    </span>
  );

  const fields = (
    <div className={cn("shrink-0", variant === "inline" ? "px-0" : "px-4")}>
      {variant === "mobile" && (
        <div className="flex h-12 items-center gap-3 border-b border-line font-body text-sm">
          <span className="text-fg-3">From</span>
          <span className="truncate text-fg">{account.email}</span>
        </div>
      )}
      <RecipientField label="To" value={to} onChange={setTo} trailing={ccToggles} />
      {showCc && <RecipientField label="Cc" value={cc} onChange={setCc} autoFocus={!cc.length} />}
      {showBcc && <RecipientField label="Bcc" value={bcc} onChange={setBcc} autoFocus={!bcc.length} />}
      {(variant !== "inline" || msg.replyKind === "forward") && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          aria-label="Subject"
          className="h-10 w-full border-b border-line bg-transparent font-body text-sm text-fg outline-none placeholder:text-fg-3"
        />
      )}
    </div>
  );

  const body = (
    <div
      className={cn("compose-editor relative min-h-0 flex-1 cursor-text overflow-y-auto", variant === "inline" ? "px-0" : "px-4", dragOver && "ring-2 ring-inset ring-primary")}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest(".ProseMirror, button, a, input, .mail-body")) editor?.commands.focus("end");
      }}
    >
      <EditorContent editor={editor} className={cn("[&>.ProseMirror]:min-h-[inherit]", variant === "inline" ? "min-h-[96px]" : "min-h-[120px]")} />
      {msg.signature && (
        <div className="group relative mb-3 mr-8 mt-2 w-fit font-body text-sm leading-5 text-fg-3">
          <div className="mail-signature" dangerouslySetInnerHTML={{ __html: `-- <br>${sanitize(msg.signature)}` }} />
          <Tip label="Remove signature">
            <button
              type="button"
              aria-label="Remove signature"
              onClick={() => getMail().updateDraft(id, { signature: undefined })}
              className="absolute -right-8 top-0 inline-flex size-6 items-center justify-center rounded-full text-fg-3 opacity-0 hover:bg-hover hover:text-fg focus:opacity-100 group-hover:opacity-100"
            >
              <Icon name="close" size={16} />
            </button>
          </Tip>
        </div>
      )}
      {msg.quoted && (
        <div className="pb-3">
          {msg.replyKind !== "forward" && (
            <Tip label={showQuoted ? "Hide expanded content" : "Show trimmed content"}>
              <button
                type="button"
                aria-label={showQuoted ? "Hide trimmed content" : "Show trimmed content"}
                onClick={() => setShowQuoted(!showQuoted)}
                className="inline-flex h-3.5 w-6 items-center justify-center rounded-sm bg-surface-3 text-fg-2 hover:bg-hover-strong"
              >
                <Icon name="more_horiz" size={16} />
              </button>
            </Tip>
          )}
          {showQuoted && <div className="mail-body mt-2 opacity-90" dangerouslySetInnerHTML={{ __html: quotedHtml }} />}
        </div>
      )}
      {atts.length > 0 && (
        <div className="flex flex-col gap-1.5 pb-3">
          {atts.map((a) => (
            <div key={a.id} className="flex h-8 max-w-[420px] items-center gap-2 rounded-md bg-surface-2 pl-2.5 pr-1 font-body text-sm">
              <Icon name={KIND_ICON[a.kind].icon} size={16} style={{ color: KIND_ICON[a.kind].color }} />
              <span className="truncate font-medium text-primary">{a.name}</span>
              <span className="shrink-0 text-xs text-fg-3">({formatBytes(a.size)})</span>
              <button type="button" aria-label={`Remove ${a.name}`} onClick={() => removeAttachment(a)} className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-hover hover:text-fg">
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {dragOver && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] font-sans text-base text-primary">
          Drop files here
        </div>
      )}
    </div>
  );

  const bottomBar = (
    <div className={cn("flex shrink-0 items-center gap-0.5 pb-3 pt-2", variant === "inline" ? "px-0" : "px-4")}>
      <div className="flex h-9 shrink-0 overflow-hidden rounded-full bg-primary text-on-primary">
        <Tip label="Send (⌘Enter)" side="top">
          <button type="button" onClick={() => send()} className="h-full pl-5 pr-4 font-sans text-sm font-medium hover:brightness-110">
            Send
          </button>
        </Tip>
        <Menu>
          <Tip label="More send options" side="top">
            <MenuTrigger asChild>
              <button type="button" aria-label="More send options" className="flex h-full items-center border-l border-[color-mix(in_srgb,var(--on-primary)_30%,transparent)] px-1.5 hover:brightness-110">
                <Icon name="arrow_drop_down" size={20} />
              </button>
            </MenuTrigger>
          </Tip>
          <MenuContent side="top" align="start">
            <MenuItem icon="schedule_send" onSelect={() => setScheduleOpen(true)}>Schedule send</MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div className="ml-2 flex min-w-0 items-center overflow-hidden">
        {variant !== "mobile" && (
          <Tip label="Formatting options" side="top">
            <button type="button" aria-label="Formatting options" aria-pressed={formatting} onClick={() => setFormatting(!formatting)} className={cn("inline-flex size-9 items-center justify-center rounded-full text-icon hover:bg-hover", formatting && "bg-hover-strong")}>
              <Icon name="text_format" size={20} />
            </button>
          </Tip>
        )}
        <Tip label="Attach files" side="top">
          <button type="button" aria-label="Attach files" onClick={() => fileRef.current?.click()} className="inline-flex size-9 items-center justify-center rounded-full text-icon hover:bg-hover">
            <Icon name="attach_file" size={20} />
          </button>
        </Tip>
        <Tip label="Insert link (⌘K)" side="top">
          <button type="button" aria-label="Insert link" onMouseDown={(e) => e.preventDefault()} onClick={() => setLinkOpen(true)} className="inline-flex size-9 items-center justify-center rounded-full text-icon hover:bg-hover max-[400px]:hidden">
            <Icon name="link" size={20} />
          </button>
        </Tip>
        <EmojiButton onPick={(e) => editor?.chain().focus().insertContent(e).run()} />
        <Menu>
          <Tip label="Insert signature" side="top">
            <MenuTrigger asChild>
              <button type="button" aria-label="Insert signature" className="inline-flex size-9 items-center justify-center rounded-full text-icon hover:bg-hover max-[440px]:hidden">
                <Icon name="signature" size={20} />
              </button>
            </MenuTrigger>
          </Tip>
          <MenuContent side="top">
            <MenuLabel>Signature</MenuLabel>
            <MenuItem icon={!msg.signature ? "check" : undefined} className={msg.signature ? "pl-[52px]" : ""} onSelect={() => getMail().updateDraft(id, { signature: undefined })}>
              No signature
            </MenuItem>
            <MenuItem
              icon={msg.signature ? "check" : undefined}
              className={!msg.signature ? "pl-[52px]" : ""}
              disabled={!settings.signature.trim()}
              onSelect={() => getMail().updateDraft(id, { signature: settings.signature })}
            >
              {account.name}
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon="edit" onSelect={() => navigate("settings/general")}>Manage signatures</MenuItem>
          </MenuContent>
        </Menu>
        <Menu>
          <Tip label="More options" side="top">
            <MenuTrigger asChild>
              <button type="button" aria-label="More options" className="inline-flex size-9 items-center justify-center rounded-full text-icon hover:bg-hover">
                <Icon name="more_vert" size={20} />
              </button>
            </MenuTrigger>
          </Tip>
          <MenuContent side="top">
            {variant === "mobile" && <MenuItem icon="text_format" onSelect={() => setFormatting(!formatting)}>{formatting ? "Hide formatting" : "Show formatting"}</MenuItem>}
            <MenuItem icon="link" onSelect={() => setLinkOpen(true)}>Insert link</MenuItem>
            <MenuItem icon="schedule_send" onSelect={() => setScheduleOpen(true)}>Schedule send</MenuItem>
            <MenuItem icon="format_clear" onSelect={() => editor?.commands.setContent(`<p>${(editor.getText() || "").split("\n").map((l) => l.replace(/[<>&]/g, "")).join("</p><p>")}</p>`)}>
              Plain text mode
            </MenuItem>
            <MenuItem icon={spell ? "check" : "close"} onSelect={() => setSpell(!spell)}>Check spelling</MenuItem>
            {variant === "inline" && <MenuItem icon="open_in_new" onSelect={popOut}>Pop out reply</MenuItem>}
          </MenuContent>
        </Menu>
      </div>
      <span className="ml-auto shrink-0 pl-2 font-body text-xs text-fg-3" aria-live="polite">
        {status === "saving" ? "Saving…" : status === "saved" ? "Draft saved" : ""}
      </span>
      <Tip label="Discard draft" side="top">
        <button type="button" aria-label="Discard draft" onClick={() => actions.discardDraft(id)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-icon hover:bg-hover">
          <Icon name="delete" size={20} />
        </button>
      </Tip>
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
  };

  const dialogs = (
    <>
      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} onPick={(t) => send(t)} />
      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} editor={editor} />
    </>
  );

  if (variant === "inline") {
    const kindIcon: IconKey = msg.replyKind === "forward" ? "forward" : msg.replyKind === "replyAll" ? "reply_all" : "reply";
    return (
      <div data-composer={id} onKeyDown={onKeyDown} {...dropHandlers} className="flex flex-col rounded-2xl border border-outline-soft bg-surface px-4 pt-2 shadow-e1">
        <div className="flex items-start gap-1">
          <Menu>
            <MenuTrigger asChild>
              <button type="button" aria-label="Type of response" className="mt-1 inline-flex h-8 shrink-0 items-center rounded-full pl-1.5 text-icon hover:bg-hover">
                <Icon name={kindIcon} size={20} />
                <Icon name="arrow_drop_down" size={18} />
              </button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon="reply" onSelect={() => switchKind("reply")}>Reply</MenuItem>
              {orig && orig.to.length + orig.cc.length > 1 && <MenuItem icon="reply_all" onSelect={() => switchKind("replyAll")}>Reply all</MenuItem>}
              <MenuItem icon="forward" onSelect={() => switchKind("forward")}>Forward</MenuItem>
              <MenuSeparator />
              <MenuItem icon="open_in_new" onSelect={popOut}>Pop out reply</MenuItem>
            </MenuContent>
          </Menu>
          <div className="min-w-0 flex-1">{fields}</div>
          <IconButton icon="open_in_new" label="Pop out reply" size="sm" className="mt-1" onClick={popOut} />
        </div>
        {body}
        {formatting && editor && <div className="-mx-3"><FormatBar editor={editor} /></div>}
        {bottomBar}
        {dialogs}
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div data-composer={id} onKeyDown={onKeyDown} className="safe-bottom fixed inset-0 z-[75] flex flex-col bg-surface animate-rise" role="dialog" aria-label={title}>
        <div className="flex h-14 shrink-0 items-center gap-1 px-1">
          <IconButton icon="arrow_back" size="lg" label="Save & close" onClick={close} />
          <span className="flex-1 truncate font-sans text-lg text-fg">{msg.replyKind === "new" ? "Compose" : msg.replyKind === "forward" ? "Forward" : "Reply"}</span>
          <IconButton icon="attach_file" size="lg" label="Attach files" onClick={() => fileRef.current?.click()} />
          <IconButton icon="send" size="lg" label="Send" onClick={() => send()} className="text-primary" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {fields}
          <div className="flex min-h-[240px] flex-1 flex-col pt-2">{body}</div>
        </div>
        {formatting && editor && <FormatBar editor={editor} />}
        {bottomBar}
        {dialogs}
      </div>
    );
  }

  const header = (
    <div
      className={cn("flex h-10 shrink-0 cursor-pointer items-center gap-1 pl-4 pr-2", minimized ? "rounded-t-2xl bg-surface-3" : "bg-surface-3")}
      onClick={() => ui().updateComposer(id, { minimized: !minimized, maximized: false })}
    >
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-fg">{title}</span>
      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
        <IconButton icon="remove" size="xs" label={minimized ? "Restore" : "Minimize"} onClick={() => ui().updateComposer(id, { minimized: !minimized, maximized: false })} />
        <IconButton
          icon={maximized ? "close_fullscreen" : "open_in_full"}
          size="xs"
          label={maximized ? "Exit full screen" : "Full screen"}
          onClick={() => ui().updateComposer(id, { maximized: !maximized, minimized: false })}
        />
        <IconButton icon="close" size="xs" label="Save & close" onClick={close} />
      </div>
    </div>
  );

  const windowEl = (
    <div
      data-composer={id}
      role="dialog"
      aria-label={title}
      onKeyDown={onKeyDown}
      {...dropHandlers}
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden bg-surface shadow-e3",
        maximized ? "h-[min(92dvh,900px)] w-[min(94vw,1100px)] rounded-2xl" : minimized ? "w-[280px] rounded-t-2xl" : "h-[min(620px,calc(100dvh-88px))] w-[min(560px,calc(100vw-32px))] rounded-t-2xl",
      )}
    >
      {header}
      {!minimized && (
        <>
          {fields}
          {body}
          {formatting && editor && <FormatBar editor={editor} />}
          {bottomBar}
        </>
      )}
      {dialogs}
    </div>
  );

  if (maximized) {
    return (
      <div className="pointer-events-auto fixed inset-0 z-[72] flex items-center justify-center bg-[var(--scrim)] animate-fade" onMouseDown={(e) => e.target === e.currentTarget && ui().updateComposer(id, { maximized: false })}>
        {windowEl}
      </div>
    );
  }
  return windowEl;
}
