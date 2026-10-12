import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useMail } from "../lib/store";
import type { Attachment } from "../lib/types";
import { fileSize, kindColor } from "../lib/format";
import { IconButton } from "./ui";
import { AttachmentIcon } from "./MailList";

function photoSvg(hue: number) {
  const h2 = (hue + 40) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,78%)"/><stop offset="1" stop-color="hsl(${h2},65%,88%)"/></linearGradient></defs><rect width="400" height="300" fill="url(#s)"/><circle cx="300" cy="90" r="38" fill="hsl(${(hue + 20) % 360},90%,92%)" opacity=".9"/><path d="M0 230 L90 150 L160 210 L250 120 L400 240 L400 300 L0 300Z" fill="hsl(${h2},35%,42%)" opacity=".85"/><path d="M0 260 L120 200 L220 250 L320 190 L400 230 L400 300 L0 300Z" fill="hsl(${hue},40%,28%)" opacity=".9"/></svg>`;
}

export function previewSrc(a: Attachment): string | null {
  if (a.dataUrl && a.dataUrl.startsWith("data:image")) return a.dataUrl;
  if (a.kind === "image") return `data:image/svg+xml;utf8,${encodeURIComponent(photoSvg(a.hue ?? 200))}`;
  return null;
}

function DocPage({ a, large }: { a: Attachment; large?: boolean }) {
  const color = kindColor[a.kind];
  const lines = large ? 22 : 7;
  return (
    <div className="flex h-full w-full flex-col gap-1.5 bg-white p-3" style={{ padding: large ? 40 : undefined }}>
      <div className="h-2 w-1/2 rounded-sm" style={{ background: color, opacity: 0.8, height: large ? 14 : 8 }} />
      {a.kind === "sheet" ? (
        <div className="mt-1 grid flex-1 grid-cols-4 gap-px bg-[#dadce0]">
          {Array.from({ length: large ? 64 : 16 }).map((_, i) => (
            <div key={i} className="bg-white" />
          ))}
        </div>
      ) : (
        Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-1.5 rounded-sm bg-[#e8eaed]" style={{ width: `${60 + ((i * 37) % 40)}%`, height: large ? 8 : 6 }} />
        ))
      )}
    </div>
  );
}

export function downloadAttachment(a: Attachment) {
  let href: string;
  if (a.dataUrl) href = a.dataUrl;
  else if (a.kind === "image") href = `data:image/svg+xml;utf8,${encodeURIComponent(photoSvg(a.hue ?? 200))}`;
  else href = URL.createObjectURL(new Blob([`Demo attachment: ${a.name}\nSize: ${fileSize(a.size)}\n`], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = a.kind === "image" && !a.dataUrl ? a.name.replace(/\.\w+$/, ".svg") : a.dataUrl ? a.name : a.name + ".txt";
  link.click();
  if (href.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function AttachmentCard({ a, list }: { a: Attachment; list: Attachment[] }) {
  const set = useMail((s) => s.set);
  const src = previewSrc(a);
  return (
    <div className="group/att relative h-[124px] w-[180px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
      <button className="block h-[84px] w-full overflow-hidden bg-chip" onClick={() => set({ preview: { attachment: a, list } })} aria-label={`Preview ${a.name}`}>
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="h-full px-4 pt-3"><DocPage a={a} /></div>}
      </button>
      <div className="flex h-10 items-center gap-2 border-t border-line px-2.5">
        <AttachmentIcon a={a} size={16} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">{a.name}</span>
          <span className="block text-[11px] text-ink-3">{fileSize(a.size)}</span>
        </span>
      </div>
      <div
        onClick={() => set({ preview: { attachment: a, list } })}
        className="pointer-events-none absolute inset-0 flex cursor-pointer items-start justify-end gap-1 bg-black/0 p-2 opacity-0 transition group-hover/att:pointer-events-auto group-hover/att:bg-black/35 group-hover/att:opacity-100"
      >
        <button data-tip="Preview" onClick={(e) => { e.stopPropagation(); set({ preview: { attachment: a, list } }); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1f1f1f] hover:bg-white">
          <Eye size={16} />
        </button>
        <button data-tip="Download" onClick={(e) => { e.stopPropagation(); downloadAttachment(a); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1f1f1f] hover:bg-white">
          <Download size={16} />
        </button>
      </div>
    </div>
  );
}

export function AttachmentPreview() {
  const preview = useMail((s) => s.preview);
  const set = useMail((s) => s.set);
  const idx = preview ? preview.list.findIndex((x) => x.id === preview.attachment.id) : -1;
  const go = (d: number) => {
    if (!preview) return;
    const next = preview.list[idx + d];
    if (next) set({ preview: { ...preview, attachment: next } });
  };
  useEffect(() => {
    if (!preview) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); set({ preview: null }); }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", on, true);
    return () => document.removeEventListener("keydown", on, true);
  });
  if (!preview) return null;
  const a = preview.attachment;
  const src = previewSrc(a);
  return createPortal(
    <div className="anim-fade fixed inset-0 z-[95] flex flex-col bg-black/85 text-white" onClick={() => set({ preview: null })}>
      <div className="flex h-16 shrink-0 items-center gap-3 px-4" onClick={(e) => e.stopPropagation()}>
        <IconButton tip="Close" className="text-white hover:bg-white/10" onClick={() => set({ preview: null })}>
          <X size={22} />
        </IconButton>
        <AttachmentIcon a={a} size={20} />
        <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
        <span className="hidden text-sm text-white/70 sm:inline">{fileSize(a.size)}</span>
        <IconButton tip="Download" className="text-white hover:bg-white/10" onClick={() => downloadAttachment(a)}>
          <Download size={20} />
        </IconButton>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-10">
        {idx > 0 && (
          <button aria-label="Previous" className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" onClick={(e) => { e.stopPropagation(); go(-1); }}>
            <ChevronLeft size={26} />
          </button>
        )}
        <div className="anim-pop max-h-full" onClick={(e) => e.stopPropagation()}>
          {src ? (
            <img src={src} alt={a.name} className="max-h-[calc(100vh-140px)] max-w-[min(1000px,calc(100vw-120px))] rounded shadow-2xl" style={{ minWidth: 280, minHeight: 200, objectFit: "contain" }} />
          ) : (
            <div className="aspect-[8.5/11] h-[min(calc(100vh-140px),900px)] max-w-[calc(100vw-40px)] overflow-hidden rounded shadow-2xl">
              <DocPage a={a} large />
            </div>
          )}
        </div>
        {idx < preview.list.length - 1 && (
          <button aria-label="Next" className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" onClick={(e) => { e.stopPropagation(); go(1); }}>
            <ChevronRight size={26} />
          </button>
        )}
      </div>
      {preview.list.length > 1 && (
        <div className="pb-4 text-center text-sm text-white/70">
          {idx + 1} of {preview.list.length}
        </div>
      )}
    </div>,
    document.body,
  );
}
