import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { documentSections, downloadAttachment, fakeArchiveEntries, imagePreview, prettyName } from "../lib/attachments";
import { formatSize, nextWeekday } from "../lib/format";
import type { Attachment } from "../lib/types";
import { useUI } from "../lib/ui";
import { attachmentKind, cn, KIND_META, seededRandom } from "../lib/utils";
import { Icon, IconButton } from "./ui";

export function AttachmentChip({ att, onOpen }: { att: Attachment; onOpen: () => void }) {
  const kind = attachmentKind(att.name, att.mime);
  const meta = KIND_META[kind];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      data-tip={att.name}
      className="inline-flex h-8 max-w-[190px] shrink-0 items-center gap-2 rounded-full border border-line bg-surface pl-2 pr-3 text-[13px] font-medium text-fg-2 hover:bg-hover"
    >
      <Icon name={meta.icon} size={18} fill style={{ color: meta.color }} />
      <span className="truncate">{att.name}</span>
    </button>
  );
}

export function AttachmentCard({ att, onOpen, sender, subject }: { att: Attachment; onOpen: () => void; sender?: string; subject?: string }) {
  const kind = attachmentKind(att.name, att.mime);
  const meta = KIND_META[kind];
  const isImage = kind === "image";
  return (
    <div data-attachment className="group/att relative h-[120px] w-[180px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface-3">
      <button type="button" onClick={onOpen} className="absolute inset-0 text-left" aria-label={`Preview ${att.name}`}>
        {isImage ? (
          <img src={imagePreview(att)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-start justify-center overflow-hidden pt-3">
            <MiniDoc att={att} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex h-10 items-center gap-2 bg-surface px-2.5 shadow-[0_-1px_0_var(--border)]">
          <Icon name={meta.icon} size={18} fill style={{ color: meta.color }} />
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{att.name}</span>
        </div>
      </button>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-black/55 p-2.5 text-white opacity-0 transition-opacity group-focus-within/att:opacity-100 group-hover/att:opacity-100">
        <div className="text-xs font-medium">
          <div className="truncate">{att.name}</div>
          <div className="opacity-80">{formatSize(att.size)}</div>
        </div>
        <div className="flex justify-center gap-2 group-hover/att:pointer-events-auto">
          <button
            type="button"
            aria-label={`Download ${att.name}`}
            data-tip="Download"
            onClick={() => downloadAttachment(att, { sender, subject })}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/35"
          >
            <Icon name="download" size={18} />
          </button>
          <button
            type="button"
            aria-label={`Preview ${att.name}`}
            data-tip="Preview"
            onClick={onOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/35"
          >
            <Icon name="visibility" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniDoc({ att }: { att: Attachment }) {
  const kind = attachmentKind(att.name, att.mime);
  const meta = KIND_META[kind];
  if (kind === "sheet") {
    return (
      <div className="grid w-[140px] grid-cols-4 gap-px bg-[#cfd8dc] p-px">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className={cn("h-3", i < 4 ? "bg-[#0f9d58]/70" : "bg-white")} />
        ))}
      </div>
    );
  }
  if (kind === "slides") {
    return (
      <div className="flex h-[70px] w-[124px] flex-col justify-center gap-1.5 rounded bg-white px-3 shadow-sm">
        <div className="h-2.5 w-3/4 rounded bg-[#f4b400]" />
        <div className="h-1.5 w-1/2 rounded bg-gray-300" />
      </div>
    );
  }
  return (
    <div className="flex h-[96px] w-[110px] flex-col gap-1.5 rounded-sm bg-white p-3 shadow-sm">
      <div className="h-2 w-2/3 rounded" style={{ background: meta.color, opacity: 0.8 }} />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-1 rounded bg-gray-200" style={{ width: `${60 + ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

export function AttachmentViewer({ attachments, index, sender }: { attachments: Attachment[]; index: number; sender?: string }) {
  const [i, setI] = useState(index);
  const close = useUI((s) => s.closeDialog);
  const att = attachments[i];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, attachments.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [attachments.length, close]);
  if (!att) return null;
  const kind = attachmentKind(att.name, att.mime);
  const meta = KIND_META[kind];

  return createPortal(
    <div className="animate-fade fixed inset-0 z-[850] flex flex-col bg-[#1b1b1d]/[.97] text-white backdrop-blur-sm" role="dialog" aria-modal aria-label={`Preview of ${att.name}`}>
      <div className="flex h-16 shrink-0 items-center gap-3 px-3">
        <IconButton icon="arrow_back" label="Close" onClick={close} className="text-white hover:bg-white/10" />
        <Icon name={meta.icon} fill style={{ color: meta.color }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{att.name}</div>
          <div className="text-xs text-white/60">
            {formatSize(att.size)} · {meta.label}
            {sender ? ` · from ${sender}` : ""}
          </div>
        </div>
        <span className="hidden text-xs text-white/60 sm:block">
          {i + 1} of {attachments.length}
        </span>
        <IconButton
          icon="download"
          label="Download"
          className="text-white hover:bg-white/10"
          onClick={() => downloadAttachment(att, { sender })}
        />
        <IconButton icon="print" label="Print" className="text-white hover:bg-white/10" onClick={() => window.print()} />
        <IconButton icon="close" label="Close" className="text-white hover:bg-white/10" onClick={close} />
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-10" onClick={(e) => e.target === e.currentTarget && close()}>
        {i > 0 && (
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setI(i - 1)}
            className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
          >
            <Icon name="chevron_left" size={28} />
          </button>
        )}
        <div className="animate-pop flex max-h-full max-w-full items-center justify-center" key={att.id}>
          <Preview att={att} />
        </div>
        {i < attachments.length - 1 && (
          <button
            type="button"
            aria-label="Next"
            onClick={() => setI(i + 1)}
            className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
          >
            <Icon name="chevron_right" size={28} />
          </button>
        )}
      </div>
      {attachments.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-4">
          {attachments.map((a, idx) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setI(idx)}
              className={cn(
                "flex h-10 max-w-[180px] items-center gap-2 rounded-lg px-3 text-xs",
                idx === i ? "bg-white/20" : "bg-white/5 hover:bg-white/10",
              )}
            >
              <Icon name={KIND_META[attachmentKind(a.name, a.mime)].icon} size={16} />
              <span className="truncate">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

function ImagePreview({ att }: { att: Attachment }) {
  const [ratio, setRatio] = useState(4 / 3);
  return (
    <img
      src={imagePreview(att)}
      alt={att.name}
      onLoad={(e) => e.currentTarget.naturalHeight && setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
      className="block h-auto max-w-[calc(100vw-32px)] rounded shadow-2xl sm:max-w-[calc(100vw-160px)]"
      style={{ width: `min(1200px, calc((100dvh - 200px) * ${ratio}))` }}
    />
  );
}

function Preview({ att }: { att: Attachment }) {
  const kind = attachmentKind(att.name, att.mime);
  if (kind === "image") return <ImagePreview att={att} />;
  if (kind === "zip") {
    const entries = fakeArchiveEntries(att.name);
    return (
      <div className="w-[min(560px,90vw)] overflow-hidden rounded-lg bg-white text-[#202124] shadow-2xl">
        <div className="flex items-center gap-2 border-b px-5 py-3 text-sm font-medium">
          <Icon name="folder_zip" className="text-[#5f6368]" /> {att.name}
          <span className="ml-auto text-xs font-normal text-[#5f6368]">{entries.length} files</span>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto text-sm">
          {entries.map((e) => (
            <li key={e.name} className="flex items-center gap-3 border-b border-gray-100 px-5 py-2.5">
              <Icon name="image" size={18} className="text-[#d93025]" />
              <span className="min-w-0 flex-1 truncate">{e.name}</span>
              <span className="text-xs text-[#5f6368]">{formatSize(e.size)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (kind === "sheet") {
    const r = seededRandom(att.name);
    const cols = ["Week", "Users", "W1", "W2", "W4", "W8"];
    return (
      <div className="max-h-[calc(100dvh-180px)] w-[min(720px,92vw)] overflow-auto rounded bg-white text-[#202124] shadow-2xl">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c} className="border border-gray-200 bg-[#e6f4ea] px-3 py-2 text-left font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 16 }, (_, row) => (
              <tr key={row}>
                <td className="border border-gray-200 px-3 py-1.5">2026-W{20 + row}</td>
                <td className="border border-gray-200 px-3 py-1.5 text-right">{800 + Math.round(r() * 600)}</td>
                {[0.6, 0.45, 0.35, 0.28].map((b, k) => (
                  <td key={k} className="border border-gray-200 px-3 py-1.5 text-right">
                    {((b + r() * 0.15) * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (kind === "slides") {
    return (
      <div className="flex aspect-video w-[min(800px,90vw)] flex-col justify-center gap-4 rounded bg-white p-[6%] text-[#202124] shadow-2xl">
        <div className="h-2 w-16 rounded bg-[#f4b400]" />
        <div className="font-display text-[clamp(20px,4vw,40px)] font-medium leading-tight">{prettyName(att.name)}</div>
        <div className="text-[clamp(12px,1.6vw,18px)] text-[#5f6368]">Lumen Labs · Confidential draft</div>
      </div>
    );
  }
  if (kind === "calendar") return <CalendarPreview att={att} />;
  return (
    <div className="max-h-[calc(100dvh-180px)] w-[min(680px,92vw)] overflow-y-auto rounded-sm bg-white px-[8%] py-[7%] text-[#202124] shadow-2xl">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: KIND_META[kind].color }}>
        {kind === "pdf" ? "PDF document" : KIND_META[kind].label}
      </div>
      <h2 className="mt-2 font-display text-2xl font-medium leading-tight">{prettyName(att.name)}</h2>
      <div className="mt-1 text-xs text-[#5f6368]">{formatSize(att.size)} · Page 1 of 1</div>
      <hr className="my-6 border-gray-200" />
      {documentSections(att.name).map((s) => (
        <section key={s.heading} className="mb-6">
          <h3 className="mb-2 text-[15px] font-bold">{s.heading}</h3>
          <ul className="space-y-1 text-sm leading-relaxed text-[#3c4043]">
            {s.lines.map((l) => (
              <li key={l} className="whitespace-pre-wrap">
                {l}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CalendarPreview({ att }: { att: Attachment }) {
  const key = `mail-rsvp-${att.id}`;
  const [rsvp, setRsvp] = useState(() => localStorage.getItem(key));
  const start = nextWeekday(Date.now(), 4, 14);
  const d = new Date(start);
  const choose = (r: string) => {
    setRsvp(r);
    localStorage.setItem(key, r);
    useUI.getState().showToast({ message: r === "No" ? "Declined. The organizer has been notified." : `RSVP sent: ${r}.` });
  };
  return (
    <div className="w-[min(440px,90vw)] rounded-xl bg-white p-6 text-[#202124] shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-[#e8f0fe] text-[#1967d2]">
          <span className="text-[10px] font-bold uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
          <span className="text-xl font-bold leading-none">{d.getDate()}</span>
        </div>
        <div className="min-w-0">
          <div className="font-medium">Design critique: Atlas empty states</div>
          <div className="text-sm text-[#5f6368]">
            {d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · 2:00 – 3:00pm
          </div>
          <div className="text-sm text-[#5f6368]">Room 4B “Fern” · Organizer: Priya Raman</div>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <span className="mr-1 text-sm text-[#5f6368]">Going?</span>
        {["Yes", "Maybe", "No"].map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={rsvp === r}
            onClick={() => choose(r)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              rsvp === r ? "border-[#1967d2] bg-[#e8f0fe] font-medium text-[#1967d2]" : "border-gray-300 hover:bg-gray-100",
            )}
          >
            {rsvp === r && <Icon name="check" size={16} className="-ml-1 mr-1 align-[-3px]" />}
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
