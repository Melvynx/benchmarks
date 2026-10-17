import type { Attachment, Thread } from "../types";
import { fileSize } from "../lib/format";
import { attIcon } from "./common";
import { Icon, IconButton } from "../ui/Icon";
import { useEffect } from "react";
import { createPortal } from "react-dom";

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Deterministic, generated visual for an attachment (no binary data is stored). */
export function AttachmentVisual({ a, full = false }: { a: Attachment; full?: boolean }) {
  const h = hash(a.name);
  if (a.type === "image") {
    const hue = h % 360;
    const hue2 = (hue + 40 + (h % 80)) % 360;
    return (
      <svg viewBox="0 0 400 300" className="att-visual" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`g${h}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 70% 72%)`} />
            <stop offset="1" stopColor={`hsl(${hue2} 60% 45%)`} />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#g${h})`} />
        <circle cx={80 + (h % 240)} cy={70 + (h % 40)} r={28 + (h % 20)} fill="rgba(255,255,255,.75)" />
        <path d={`M0 300 L${90 + (h % 60)} ${150 + (h % 50)} L${200 + (h % 40)} 240 L${280 + (h % 30)} ${170 + (h % 40)} L400 260 L400 300Z`} fill="rgba(0,0,0,.28)" />
        <path d={`M0 300 L${60 + (h % 40)} 230 L${170} 270 L${330 - (h % 50)} 210 L400 300Z`} fill="rgba(0,0,0,.35)" />
        {full && (
          <text x="16" y="286" fill="rgba(255,255,255,.85)" fontSize="13" fontFamily="system-ui">
            {a.name}
          </text>
        )}
      </svg>
    );
  }
  if (a.type === "sheet") {
    return (
      <div className="att-paper sheet">
        <div className="sheet-grid">
          {Array.from({ length: full ? 60 : 24 }).map((_, i) => (
            <span key={i} className={i < (full ? 6 : 4) ? "hd" : ""}>
              {full ? (i < 6 ? ["Item", "Owner", "Status", "Due", "Notes", "Risk"][i] : i % 6 === 2 ? ["Done", "In progress", "Blocked"][(h + i) % 3] : i % 6 === 1 ? ["Sam", "Diego", "Elena", "Marcus"][(h + i) % 4] : i % 6 === 3 ? `Oct ${10 + ((h + i) % 18)}` : "") : ""}
            </span>
          ))}
        </div>
      </div>
    );
  }
  const lines = full ? 22 : 9;
  return (
    <div className={"att-paper " + a.type}>
      <div className="paper-title">{a.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")}</div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="paper-line" style={{ width: `${60 + ((h >> i) % 40)}%` }} />
      ))}
    </div>
  );
}

export function AttachmentCard({ a, onOpen }: { a: Attachment; onOpen: () => void }) {
  const t = attIcon(a);
  return (
    <div className="att-card" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <div className="att-thumb">
        <AttachmentVisual a={a} />
      </div>
      <div className="att-meta">
        <Icon name={t.icon} size={18} style={{ color: t.color }} />
        <div className="att-names">
          <span className="ellipsis">{a.name}</span>
          <span className="muted small">{fileSize(a.size)}</span>
        </div>
      </div>
      <div className="att-overlay">
        <IconButton
          icon="download"
          label="Download"
          onClick={(e) => {
            e.stopPropagation();
            downloadAttachment(a);
          }}
        />
      </div>
    </div>
  );
}

export function downloadAttachment(a: Attachment) {
  const text = `This is a locally generated placeholder for "${a.name}" (${fileSize(a.size)}).\nThe demo mailbox does not store real attachment data.\n`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = a.name.replace(/\.[^.]+$/, "") + ".txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AttachmentPreview({ attId, threads, onClose, onNav }: { attId: string | null; threads: Thread[]; onClose: () => void; onNav: (id: string) => void }) {
  let found: { a: Attachment; list: Attachment[] } | null = null;
  if (attId) {
    for (const t of threads) {
      const list = t.messages.flatMap((m) => m.attachments);
      const a = list.find((x) => x.id === attId);
      if (a) {
        found = { a, list };
        break;
      }
    }
  }
  const idx = found ? found.list.indexOf(found.a) : -1;
  useEffect(() => {
    if (!found) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowRight" && found && idx < found.list.length - 1) onNav(found.list[idx + 1].id);
      else if (e.key === "ArrowLeft" && found && idx > 0) onNav(found.list[idx - 1].id);
    };
    document.addEventListener("keydown", on, true);
    return () => document.removeEventListener("keydown", on, true);
  });
  if (!found) return null;
  const { a, list } = found;
  const t = attIcon(a);
  return createPortal(
    <div className="preview" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="preview-bar">
        <IconButton icon="back" label="Close" onClick={onClose} />
        <Icon name={t.icon} size={20} style={{ color: t.color }} />
        <span className="preview-name ellipsis">{a.name}</span>
        <span className="muted small">{fileSize(a.size)}</span>
        <span className="grow" />
        <IconButton icon="download" label="Download" onClick={() => downloadAttachment(a)} />
        <IconButton icon="print" label="Print" onClick={() => window.print()} />
      </div>
      <div className="preview-stage" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        {idx > 0 && <IconButton icon="chevronLeft" label="Previous" className="preview-nav left" size={28} onClick={() => onNav(list[idx - 1].id)} />}
        <div className={"preview-doc " + a.type}>
          <AttachmentVisual a={a} full />
        </div>
        {idx < list.length - 1 && <IconButton icon="chevronRight" label="Next" className="preview-nav right" size={28} onClick={() => onNav(list[idx + 1].id)} />}
      </div>
      {list.length > 1 && (
        <div className="preview-count">
          {idx + 1} of {list.length}
        </div>
      )}
    </div>,
    document.body,
  );
}
