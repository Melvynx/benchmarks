import type { Attachment } from './types';
import { fileKind } from './files';

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Stand-in artwork for seeded image attachments (real bytes are never stored). */
export function placeholderImage(name: string, w = 960, h = 600): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const hue = hashOf(name) % 360;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue} 70% 62%)`);
  g.addColorStop(1, `hsl(${(hue + 55) % 360} 65% 38%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  for (let i = 0; i < 5; i++) {
    const r = 60 + ((hashOf(name + i) % 140) | 0);
    ctx.beginPath();
    ctx.arc((hashOf(name + 'x' + i) % w) | 0, (hashOf(name + 'y' + i) % h) | 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, w / 2, h / 2 + 12);
  return canvas.toDataURL('image/png');
}

function minimalPdf(title: string): Blob {
  const esc = (s: string) => s.replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7e]/g, '?');
  const stream = `BT /F1 22 Tf 72 700 Td (${esc(title)}) Tj ET\nBT /F1 12 Tf 72 670 Td (Demo attachment generated locally. The original file contents are not stored.) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
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

function save(blob: Blob | string, filename: string) {
  const url = typeof blob === 'string' ? blob : URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof blob !== 'string') setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadAttachment(att: Attachment): string {
  if (att.dataUrl) {
    save(att.dataUrl, att.name);
    return att.name;
  }
  const kind = fileKind(att.mime, att.name);
  if (kind === 'image') {
    save(placeholderImage(att.name), att.name.replace(/\.[^.]+$/, '') + '.png');
    return att.name.replace(/\.[^.]+$/, '') + '.png';
  }
  if (kind === 'pdf') {
    save(minimalPdf(att.name), att.name);
    return att.name;
  }
  const note = `${att.name}\n\nThis is a demo attachment. The original file contents are not stored in this offline mailbox.\n`;
  if (kind === 'text' || att.mime === 'text/csv') {
    save(new Blob([note], { type: 'text/plain' }), att.name);
    return att.name;
  }
  const fallback = `${att.name}.txt`;
  save(new Blob([note], { type: 'text/plain' }), fallback);
  return fallback;
}
