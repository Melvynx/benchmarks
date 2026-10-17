import { useEffect, useState } from "react";
import { useMail } from "../lib/store";
import { useUI, ui } from "../lib/ui";
import { actions } from "../lib/actions";
import { attachmentArt, attachmentBlob, downloadBlob, isBlockedAttachment, loadUpload } from "../lib/files";
import type { Attachment, Invite } from "../lib/types";
import { cn, formatBytes } from "../lib/utils";
import { Icon, IconButton } from "./ui";
import { KIND_ICON } from "./attachmentMeta";
import { formatLongDate, formatTime } from "../lib/date";

export function useBlobUrl(att: Attachment | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!att?.blobKey) return setUrl(null);
    let u: string | null = null;
    let alive = true;
    loadUpload(att.blobKey).then((b) => {
      if (!b || !alive) return;
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [att?.blobKey]);
  return url;
}

export async function downloadAttachment(att: Attachment, opts: { invite?: Invite; inSpam?: boolean } = {}) {
  if (isBlockedAttachment(att, !!opts.inSpam)) {
    ui().set({
      alert: {
        title: "Download blocked",
        body: `“${att.name}” was flagged as potentially harmful and can't be downloaded. Archives from unverified senders in Spam often contain malware.`,
      },
    });
    return;
  }
  const blob = await attachmentBlob(att, opts.invite);
  if (!blob) {
    ui().showToast({ message: "This file is no longer available." });
    return;
  }
  await downloadBlob(blob, att.name);
  ui().showToast({ message: `Downloading “${att.name}”` });
}

function DocThumb({ att, big }: { att: Attachment; big?: boolean }) {
  const lines = att.seed?.lines || [];
  return (
    <div className={cn("h-full w-full overflow-hidden bg-white text-left text-[#3c4043]", big ? "p-12" : "p-3")}>
      <div className="mb-1 h-1 w-full rounded-full" style={{ background: KIND_ICON[att.kind].color, opacity: 0.85 }} />
      <div className={cn("font-bold text-[#202124]", big ? "mb-6 mt-4 text-3xl" : "mb-1.5 mt-1 text-[9px] leading-tight")}>
        {att.seed?.title || att.name.replace(/\.[^.]+$/, "")}
      </div>
      {lines.length
        ? lines.map((l, i) =>
            l.startsWith("## ") ? (
              <div key={i} className={cn("font-bold text-[#202124]", big ? "mb-2 mt-5 text-lg" : "mt-1 text-[7px]")}>{l.slice(3)}</div>
            ) : (
              <div key={i} className={cn(big ? "min-h-6 text-base leading-7" : "truncate text-[6.5px] leading-[9px]")}>{l || "\u00a0"}</div>
            ),
          )
        : Array.from({ length: big ? 18 : 8 }, (_, i) => <div key={i} className={cn("rounded bg-[#e8eaed]", big ? "mb-3 h-3" : "mb-1 h-1")} style={{ width: `${60 + ((i * 37) % 40)}%` }} />)}
    </div>
  );
}

function SheetThumb({ att, big }: { att: Attachment; big?: boolean }) {
  const rows = att.seed?.rows || Array.from({ length: 8 }, (_, r) => Array.from({ length: 5 }, (_, c) => (r === 0 ? `Col ${c + 1}` : `${(r * 13 + c * 7) % 97}`)));
  return (
    <div className="h-full w-full overflow-auto bg-white">
      <table className={cn("w-full border-collapse text-[#202124]", big ? "text-sm" : "text-[7px]")}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i === 0 ? "bg-[#e6f4ea] font-bold" : ""}>
              {r.map((c, j) => (
                <td key={j} className={cn("border border-[#dadce0]", big ? "px-3 py-1.5" : "px-1")}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AttachmentVisual({ att, big }: { att: Attachment; big?: boolean }) {
  const blobUrl = useBlobUrl(att);
  const k = KIND_ICON[att.kind];
  if (att.kind === "image") {
    const src = att.blobKey ? blobUrl : attachmentArt(att);
    return src ? <img src={src} alt={att.name} className={cn("h-full w-full", big ? "object-contain" : "object-cover")} draggable={false} /> : null;
  }
  if (att.blobKey && big && att.kind === "pdf" && blobUrl) return <iframe title={att.name} src={blobUrl} className="h-full w-full bg-white" />;
  if (!att.blobKey && (att.kind === "pdf" || att.kind === "doc")) return <DocThumb att={att} big={big} />;
  if (!att.blobKey && att.kind === "sheet") return <SheetThumb att={att} big={big} />;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-2">
      <Icon name={k.icon} size={big ? 96 : 44} style={{ color: k.color }} />
      {big && <div className="font-sans text-sm text-fg-2">{k.label} · {formatBytes(att.size)}</div>}
    </div>
  );
}

export function AttachmentGrid({ atts, messageId, invite, inSpam }: { atts: Attachment[]; messageId: string; invite?: Invite; inSpam?: boolean }) {
  const shown = atts.filter((a) => a.kind !== "calendar" || !invite);
  if (!shown.length) return null;
  const downloadAll = async () => {
    for (const a of shown) await downloadAttachment(a, { invite, inSpam });
  };
  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="mb-3 flex items-center gap-2 font-sans text-sm text-fg-2">
        <span className="font-medium">{shown.length === 1 ? "One attachment" : `${shown.length} attachments`}</span>
        {shown.length > 1 && <IconButton icon="download" label="Download all" size="sm" className="ml-auto" onClick={downloadAll} />}
      </div>
      <div className="flex flex-wrap gap-3">
        {shown.map((a) => (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => ui().set({ preview: { messageId, attachmentId: a.id } })}
            onKeyDown={(e) => e.key === "Enter" && ui().set({ preview: { messageId, attachmentId: a.id } })}
            className="group relative h-[120px] w-[176px] cursor-pointer overflow-hidden rounded-lg border border-outline-soft bg-surface max-sm:w-[calc(50%-6px)]"
            aria-label={`Preview ${a.name}`}
          >
            <div className="h-[84px] overflow-hidden">
              <AttachmentVisual att={a} />
            </div>
            <div className="flex h-9 items-center gap-2 border-t border-outline-soft bg-surface-2 px-2.5">
              <Icon name={KIND_ICON[a.kind].icon} size={16} style={{ color: KIND_ICON[a.kind].color }} />
              <span className="truncate font-body text-xs text-fg-2">{a.name}</span>
            </div>
            <div className="absolute inset-0 hidden flex-col justify-between bg-black/65 p-2.5 text-white group-hover:flex group-focus-visible:flex">
              <div className="min-w-0">
                <div className="truncate font-sans text-[13px] font-medium">{a.name}</div>
                <div className="font-body text-xs opacity-80">{formatBytes(a.size)}</div>
              </div>
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  aria-label={`Download ${a.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadAttachment(a, { invite, inSpam });
                  }}
                  className="inline-flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/30"
                >
                  <Icon name="download" size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttachmentPreview() {
  const preview = useUI((s) => s.preview);
  const msg = useMail((s) => (preview ? s.messages[preview.messageId] : undefined));
  const thread = useMail((s) => (msg ? s.threads[msg.threadId] : undefined));
  const atts = msg?.attachments.filter((a) => a.kind !== "calendar" || !msg.invite) || [];
  const idx = atts.findIndex((a) => a.id === preview?.attachmentId);
  const att = idx >= 0 ? atts[idx] : undefined;
  const close = () => ui().set({ preview: null });
  const go = (d: number) => {
    if (!msg || !atts.length) return;
    const n = (idx + d + atts.length) % atts.length;
    ui().set({ preview: { messageId: msg.id, attachmentId: atts[n].id } });
  };
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else return;
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });
  if (!preview || !msg || !att) return null;
  const k = KIND_ICON[att.kind];
  const isDoc = !att.blobKey && (att.kind === "pdf" || att.kind === "doc");
  return (
    <div className="no-print fixed inset-0 z-[95] flex flex-col bg-[rgba(10,10,12,.92)] text-white animate-fade" role="dialog" aria-label={`Preview of ${att.name}`}>
      <div className="flex h-16 shrink-0 items-center gap-3 px-3">
        <IconButton icon="arrow_back" label="Close" onClick={close} className="text-white hover:bg-white/10" />
        <Icon name={k.icon} size={22} style={{ color: k.color }} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-sans text-base">{att.name}</div>
          <div className="truncate font-body text-xs text-white/60">
            {formatBytes(att.size)} · from {msg.from.name || msg.from.email}
          </div>
        </div>
        <IconButton
          icon="download"
          label="Download"
          className="text-white hover:bg-white/10"
          onClick={() => downloadAttachment(att, { invite: msg.invite, inSpam: thread?.labels.includes("SPAM") })}
        />
        {atts.length > 1 && <span className="px-2 font-body text-sm text-white/70">{idx + 1} / {atts.length}</span>}
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-20" onClick={(e) => e.target === e.currentTarget && close()}>
        <div
          className={cn(
            "overflow-hidden",
            att.kind === "image" ? "h-full w-full" : isDoc ? "aspect-[8.5/11] h-full max-h-full max-w-full rounded shadow-2xl" : att.kind === "sheet" && !att.blobKey ? "h-[70%] w-full max-w-4xl rounded shadow-2xl" : "h-[60%] w-full max-w-xl rounded-2xl",
          )}
        >
          <AttachmentVisual att={att} big />
        </div>
        {atts.length > 1 && (
          <>
            <button type="button" aria-label="Previous attachment" onClick={() => go(-1)} className="absolute left-3 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <Icon name="chevron_left" size={28} />
            </button>
            <button type="button" aria-label="Next attachment" onClick={() => go(1)} className="absolute right-3 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <Icon name="chevron_right" size={28} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function InviteCard({ messageId }: { messageId: string }) {
  const msg = useMail((s) => s.messages[messageId]);
  const inv = msg?.invite;
  if (!inv) return null;
  const date = `${formatLongDate(inv.start)} · ${formatTime(inv.start)} – ${formatTime(inv.end)}`;
  const resp = inv.response;
  const btn = (r: "yes" | "maybe" | "no", label: string) => (
    <button
      type="button"
      onClick={() => actions.rsvp(messageId, r)}
      aria-pressed={resp === r}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-4 font-sans text-sm font-medium",
        resp === r ? "border-transparent bg-primary-soft text-on-primary-soft" : "border-outline text-fg-2 hover:bg-hover",
      )}
    >
      {resp === r && <Icon name="check" size={16} />}
      {label}
    </button>
  );
  return (
    <div className="mt-4 max-w-xl overflow-hidden rounded-xl border border-outline-soft font-sans">
      <div className="flex gap-4 p-4">
        <div className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-lg border border-outline-soft text-center">
          <div className="w-full bg-[#1a73e8] py-0.5 text-[10px] font-medium uppercase text-white">{new Date(inv.start).toLocaleString("en-US", { month: "short" })}</div>
          <div className="py-1 text-xl text-fg">{new Date(inv.start).getDate()}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base text-fg">{inv.title}</div>
          <div className="mt-1 text-sm text-fg-2">{date}</div>
          {inv.location && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-fg-2">
              <Icon name="location_on" size={16} />
              {inv.location}
            </div>
          )}
          {inv.videoLink && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-primary">
              <Icon name="videocam" size={16} />
              {inv.videoLink}
            </div>
          )}
          <div className="mt-2 flex items-center gap-1">
            {inv.guests.slice(0, 5).map((g) => (
              <span key={g.email} title={`${g.name} <${g.email}>`} className="inline-flex size-6 items-center justify-center rounded-full text-[11px] font-medium text-white" style={{ background: `hsl(${(g.email.length * 47) % 360} 55% 45%)` }}>
                {g.name[0]}
              </span>
            ))}
            <span className="ml-1 text-xs text-fg-3">{inv.guests.length} guests · Organizer: {inv.organizer.name}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-outline-soft bg-surface-2 px-4 py-3">
        <span className="mr-2 text-sm text-fg-2">Going?</span>
        {btn("yes", "Yes")}
        {btn("maybe", "Maybe")}
        {btn("no", "No")}
        <button type="button" onClick={() => ui().set({ sidePanel: "calendar" })} className="ml-auto text-sm font-medium text-primary hover:underline">
          View on calendar
        </button>
      </div>
    </div>
  );
}
