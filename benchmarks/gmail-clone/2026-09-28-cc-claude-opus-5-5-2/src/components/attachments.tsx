import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { IconType } from 'react-icons';
import {
  MdArrowBack, MdAudiotrack, MdChevronLeft, MdChevronRight, MdDescription, MdFileDownload, MdFolderZip, MdImage,
  MdInsertDriveFile, MdMovie, MdPictureAsPdf, MdSlideshow, MdTableChart,
} from 'react-icons/md';
import type { Attachment, AttachmentKind } from '../data/types';
import { fileSize, hash } from '../lib/format';
import { useUI } from '../store/ui';
import { IconButton } from './primitives';

const KIND: Record<AttachmentKind, { icon: IconType; color: string; label: string }> = {
  pdf: { icon: MdPictureAsPdf, color: '#ea4335', label: 'PDF' },
  image: { icon: MdImage, color: '#d93025', label: 'Image' },
  doc: { icon: MdDescription, color: '#4285f4', label: 'Document' },
  sheet: { icon: MdTableChart, color: '#0f9d58', label: 'Spreadsheet' },
  slides: { icon: MdSlideshow, color: '#f4b400', label: 'Presentation' },
  zip: { icon: MdFolderZip, color: '#5f6368', label: 'Archive' },
  audio: { icon: MdAudiotrack, color: '#e37400', label: 'Audio' },
  video: { icon: MdMovie, color: '#d93025', label: 'Video' },
  file: { icon: MdInsertDriveFile, color: '#5f6368', label: 'File' },
};

export function AttachmentIcon({ kind, size }: { kind: AttachmentKind; size?: number }) {
  const k = KIND[kind];
  return <k.icon className="att-icon" style={{ color: k.color, fontSize: size }} aria-label={k.label} />;
}

/** Deterministic illustration used as the "photo" for seeded image attachments. */
export function generatedImage(name: string): string {
  const h = hash(name);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 80)) % 360;
  const sunX = 120 + (h % 360);
  const peaks = Array.from({ length: 5 }, (_, i) => 60 + ((h >> (i * 3)) % 140));
  const ridge = (base: number, amp: number, shift: number) =>
    `M0 ${base} ` + peaks.map((p, i) => `L${(i + 1) * 128 - shift} ${base - (p * amp) / 100}`).join(' ') + ` L640 ${base} L640 400 L0 400 Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,78%)"/><stop offset="1" stop-color="hsl(${hue2},80%,90%)"/></linearGradient></defs>
<rect width="640" height="400" fill="url(#s)"/>
<circle cx="${sunX}" cy="120" r="46" fill="hsl(${(hue + 190) % 360},90%,92%)" opacity=".9"/>
<path d="${ridge(300, 120, 40)}" fill="hsl(${hue},35%,55%)"/>
<path d="${ridge(340, 80, 0)}" fill="hsl(${hue},40%,40%)"/>
<path d="${ridge(380, 50, 70)}" fill="hsl(${hue},45%,26%)"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function imageSrc(a: Attachment) {
  return a.dataUrl && a.kind === 'image' ? a.dataUrl : generatedImage(a.name);
}

function defaultPreview(a: Attachment) {
  return `${a.name}\n\n${KIND[a.kind].label} · ${fileSize(a.size)}\n\nThis file is stored with the message on this device.`;
}

/* ---------- Downloads ---------- */

function pdfFromText(title: string, text: string): Blob {
  const clean = (s: string) => s.replace(/[^\x20-\x7e]/g, (c) => ({ '—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '•': '*', '…': '...' } as Record<string, string>)[c] ?? '?').replace(/[\\()]/g, '\\$&');
  const lines = [title, '', ...text.split('\n')].flatMap((l) => {
    const out: string[] = [];
    let rest = l;
    while (rest.length > 88) {
      out.push(rest.slice(0, 88));
      rest = rest.slice(88);
    }
    out.push(rest);
    return out;
  });
  const content = `BT /F1 11 Tf 64 740 Td 16 TL ${lines.map((l, i) => `(${clean(l)}) Tj T*${i === 0 ? ' /F1 11 Tf' : ''}`).join(' ')} ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}

export function downloadAttachment(a: Attachment) {
  let href: string;
  let name = a.name;
  let revoke = false;
  if (a.dataUrl) href = a.dataUrl;
  else if (a.kind === 'image') {
    href = generatedImage(a.name);
    name = a.name.replace(/\.[^.]+$/, '') + '.svg';
  } else if (a.kind === 'pdf') {
    href = URL.createObjectURL(pdfFromText(a.name, a.preview ?? defaultPreview(a)));
    revoke = true;
  } else {
    href = URL.createObjectURL(new Blob([a.preview ?? defaultPreview(a)], { type: 'text/plain' }));
    name = `${a.name}.txt`;
    revoke = true;
  }
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 2000);
}

/* ---------- Card ---------- */

export function AttachmentCard({ a, onOpen }: { a: Attachment; onOpen: () => void }) {
  const k = KIND[a.kind];
  return (
    <div className="att-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} aria-label={`Open ${a.name}`}>
      <div className={`att-thumb att-thumb-${a.kind}`}>
        {a.kind === 'image' ? (
          <img src={imageSrc(a)} alt="" loading="lazy" />
        ) : (
          <div className="att-page">
            {(a.preview ?? defaultPreview(a)).split('\n').slice(0, 9).map((l, i) => (
              <div key={i} className={i === 0 ? 'att-page-title' : ''}>{l || ' '}</div>
            ))}
          </div>
        )}
      </div>
      <div className="att-foot">
        <k.icon className="att-icon" style={{ color: k.color }} aria-hidden />
        <span className="att-name">{a.name}</span>
      </div>
      <div className="att-hover">
        <div className="att-hover-name">{a.name}</div>
        <div className="att-hover-size">{fileSize(a.size)}</div>
        <button
          type="button"
          className="att-dl"
          aria-label={`Download ${a.name}`}
          data-tip="Download"
          onClick={(e) => {
            e.stopPropagation();
            downloadAttachment(a);
          }}
        >
          <MdFileDownload aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ---------- Viewer ---------- */

export function AttachmentViewer() {
  const viewer = useUI((s) => s.viewer);
  const close = () => useUI.getState().set({ viewer: null });
  const a = viewer?.attachments[viewer.index];
  const count = viewer?.attachments.length ?? 0;
  const go = (d: number) => {
    if (!viewer) return;
    useUI.getState().set({ viewer: { ...viewer, index: (viewer.index + d + count) % count } });
  };
  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'ArrowRight') { e.stopPropagation(); go(1); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); go(-1); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  });
  const lines = useMemo(() => (a ? (a.preview ?? defaultPreview(a)).split('\n') : []), [a]);
  if (!viewer || !a) return null;
  const k = KIND[a.kind];
  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`Preview of ${a.name}`}>
      <div className="viewer-bar">
        <IconButton icon={MdArrowBack} label="Close" onClick={close} className="on-dark" />
        <k.icon style={{ color: k.color }} className="viewer-kind" aria-hidden />
        <div className="viewer-title">{a.name}</div>
        <div className="viewer-size">{fileSize(a.size)}</div>
        <IconButton icon={MdFileDownload} label="Download" onClick={() => downloadAttachment(a)} className="on-dark" />
      </div>
      <div className="viewer-stage" onClick={(e) => e.target === e.currentTarget && close()}>
        {count > 1 && <IconButton icon={MdChevronLeft} label="Previous" onClick={() => go(-1)} className="viewer-nav viewer-prev on-dark" size="lg" />}
        {a.kind === 'image' ? (
          <img className="viewer-img" src={imageSrc(a)} alt={a.name} />
        ) : a.kind === 'audio' || a.kind === 'video' || a.kind === 'zip' || a.kind === 'file' ? (
          <div className="viewer-none">
            <k.icon style={{ color: k.color }} aria-hidden />
            <p>No preview available</p>
            <button type="button" className="btn btn-primary" onClick={() => downloadAttachment(a)}>
              <MdFileDownload aria-hidden /> Download
            </button>
          </div>
        ) : (
          <div className={`viewer-page viewer-page-${a.kind}`}>
            {a.kind === 'sheet' ? (
              <table>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="viewer-rownum">{i + 1}</td>
                      {l.split(/\s{2,}|\t|\s\|\s|,(?=\S)/).map((c, j) => <td key={j}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              lines.map((l, i) => (
                <p key={i} className={i === 0 ? 'viewer-page-title' : ''}>{l || ' '}</p>
              ))
            )}
          </div>
        )}
        {count > 1 && <IconButton icon={MdChevronRight} label="Next" onClick={() => go(1)} className="viewer-nav viewer-next on-dark" size="lg" />}
      </div>
      {count > 1 && <div className="viewer-count">{viewer.index + 1} of {count}</div>}
    </div>,
    document.body,
  );
}
