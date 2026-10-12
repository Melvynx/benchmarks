import type { Attachment } from './types';
import { artSvg, type ArtVariant } from './art';

function ascii(s: string): string {
  return s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '');
}

export function buildPdf(title: string, lines: string[]): Blob {
  const esc = (s: string) => ascii(s).replace(/[\\()]/g, (m) => `\\${m}`);
  let stream = `BT /F1 22 Tf 72 720 Td (${esc(title)}) Tj ET\n`;
  lines.forEach((l, i) => {
    stream += `BT /F1 12 Tf 72 ${684 - i * 22} Td (${esc(l)}) Tj ET\n`;
  });
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    out += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}

function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function imageVariantFor(att: Attachment): ArtVariant {
  const n = (att.art ?? 0) % 4;
  return (['sun', 'mesh', 'city', 'waves'] as const)[n];
}

export async function downloadAttachment(att: Attachment): Promise<void> {
  if (att.dataUrl) {
    const a = document.createElement('a');
    a.href = att.dataUrl;
    a.download = att.name;
    a.click();
    return;
  }
  if (att.kind === 'image') {
    const svg = artSvg(imageVariantFor(att), att.art ?? 1, 1200, 800);
    try {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('img'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      canvas.getContext('2d')?.drawImage(img, 0, 0, 1200, 800);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (blob) {
        save(blob, att.name.replace(/\.[a-z]+$/i, '') + '.png');
        return;
      }
    } catch {
      /* fall through */
    }
    save(new Blob([svg], { type: 'image/svg+xml' }), att.name.replace(/\.[a-z]+$/i, '') + '.svg');
    return;
  }
  const lines = att.lines ?? ['(preview content unavailable in the demo mailbox)'];
  if (att.kind === 'pdf') {
    save(buildPdf(att.title ?? att.name, lines), att.name);
    return;
  }
  if (att.kind === 'sheet') {
    save(new Blob([[att.title ?? att.name, ...lines].join('\n')], { type: 'text/csv' }), att.name.replace(/\.[a-z]+$/i, '') + '.csv');
    return;
  }
  if (att.kind === 'calendar') {
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:Trip to Lisbon', 'DTSTART;VALUE=DATE:20261013', 'DTEND;VALUE=DATE:20261018', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    save(new Blob([ics], { type: 'text/calendar' }), att.name);
    return;
  }
  save(new Blob([[att.title ?? att.name, '', ...lines].join('\n')], { type: 'text/plain' }), att.name.replace(/\.[a-z0-9]+$/i, '') + '.txt');
}
