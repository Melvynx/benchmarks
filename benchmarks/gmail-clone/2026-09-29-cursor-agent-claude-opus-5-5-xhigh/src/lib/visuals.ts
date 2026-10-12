import type { IconType } from 'react-icons';
import {
  MdAudiotrack,
  MdCode,
  MdDescription,
  MdFolderZip,
  MdGridOn,
  MdImage,
  MdInsertDriveFile,
  MdMovie,
  MdPictureAsPdf,
  MdSlideshow,
} from 'react-icons/md';
import type { Attachment, LabelColor } from '../types';
import { downloadBlob } from './utils';

export const LABEL_COLORS: Record<LabelColor, { dot: string; light: [string, string]; dark: [string, string] }> = {
  red: { dot: '#e8453c', light: ['#fbd3d0', '#8a1c13'], dark: ['#5c1f1a', '#fbd3d0'] },
  orange: { dot: '#f2994a', light: ['#ffe0c2', '#7a3e00'], dark: ['#5a3310', '#ffd8b0'] },
  yellow: { dot: '#f6bf26', light: ['#fdefc3', '#6b4f00'], dark: ['#4d3d0a', '#fce8a6'] },
  green: { dot: '#33b679', light: ['#c8ecd4', '#0d5028'], dark: ['#173d27', '#bfe8cc'] },
  teal: { dot: '#26a69a', light: ['#c2ebe6', '#0b4f47'], dark: ['#0f3d38', '#b8e6e0'] },
  blue: { dot: '#4285f4', light: ['#d3e3fd', '#0b3d91'], dark: ['#16345e', '#cfe0fc'] },
  purple: { dot: '#8e63ce', light: ['#e6d8fb', '#4a2192'], dark: ['#35245a', '#e2d3fa'] },
  pink: { dot: '#e67c9e', light: ['#fbd4ea', '#7d1a53'], dark: ['#561b3d', '#f9d0e6'] },
  gray: { dot: '#9aa0a6', light: ['#e3e3e3', '#3c4043'], dark: ['#3c4043', '#e3e3e3'] },
};

export const LABEL_COLOR_KEYS = Object.keys(LABEL_COLORS) as LabelColor[];

export interface FileKind {
  kind: string;
  icon: IconType;
  color: string;
  label: string;
}

export function fileKind(name: string, type = ''): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf' || type === 'application/pdf') return { kind: 'pdf', icon: MdPictureAsPdf, color: '#ea4335', label: 'PDF' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(ext) || type.startsWith('image/'))
    return { kind: 'image', icon: MdImage, color: '#ea4335', label: 'Image' };
  if (['xlsx', 'xls', 'csv', 'numbers'].includes(ext)) return { kind: 'sheet', icon: MdGridOn, color: '#188038', label: 'Spreadsheet' };
  if (['doc', 'docx', 'txt', 'md', 'rtf', 'pages'].includes(ext)) return { kind: 'doc', icon: MdDescription, color: '#1a73e8', label: 'Document' };
  if (['ppt', 'pptx', 'key'].includes(ext)) return { kind: 'slides', icon: MdSlideshow, color: '#f9ab00', label: 'Presentation' };
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return { kind: 'zip', icon: MdFolderZip, color: '#5f6368', label: 'Archive' };
  if (['mp3', 'wav', 'm4a', 'aac'].includes(ext) || type.startsWith('audio/')) return { kind: 'audio', icon: MdAudiotrack, color: '#e37400', label: 'Audio' };
  if (['mp4', 'mov', 'webm'].includes(ext) || type.startsWith('video/')) return { kind: 'video', icon: MdMovie, color: '#d93025', label: 'Video' };
  if (['js', 'ts', 'json', 'html', 'css', 'py', 'sql'].includes(ext)) return { kind: 'code', icon: MdCode, color: '#5f6368', label: 'Code' };
  return { kind: 'file', icon: MdInsertDriveFile, color: '#5f6368', label: 'File' };
}

function svg(w: number, h: number, body: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`)}`;
}

const PALETTES: Record<string, [string, string, string, string]> = {
  sunset: ['#ff9a5a', '#ffcf7a', '#6b3a5c', '#2d1b3d'],
  lake: ['#8fd3f4', '#e0f4ff', '#2f6f8f', '#173f4f'],
  forest: ['#a8e063', '#f0ffd8', '#2e6b3a', '#153a22'],
  dusk: ['#7f7fd5', '#c9d6ff', '#3b3f7a', '#1c1e45'],
  desert: ['#f7b267', '#ffe6b8', '#b5543c', '#6e2c1f'],
  harbor: ['#6dd5ed', '#d8f7ff', '#1d5d7a', '#0b2f40'],
};

function landscape(key: string): string {
  const [sky1, sky2, hill1, hill2] = PALETTES[key] ?? PALETTES.lake;
  return svg(
    640,
    420,
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
    <rect width="640" height="420" fill="url(#s)"/>
    <circle cx="470" cy="150" r="46" fill="#fff" opacity=".75"/>
    <path d="M0 290 L110 190 L200 260 L320 150 L450 250 L540 200 L640 260 V420 H0Z" fill="${hill1}" opacity=".85"/>
    <path d="M0 330 C120 290 220 350 330 320 S520 290 640 330 V420 H0Z" fill="${hill2}"/>
    <path d="M0 370 C160 350 300 390 640 360 V420 H0Z" fill="#000" opacity=".18"/>`,
  );
}

function uiMock(step: number, accent: string): string {
  const titles = ['Welcome to Lumen', 'Connect your data', 'Invite your team', 'You’re all set'];
  const title = titles[(step - 1) % titles.length];
  return svg(
    640,
    420,
    `<rect width="640" height="420" fill="#eef1f8"/>
    <rect x="220" y="24" width="200" height="372" rx="28" fill="#111"/>
    <rect x="230" y="36" width="180" height="348" rx="20" fill="#fff"/>
    <rect x="290" y="44" width="60" height="8" rx="4" fill="#111"/>
    <circle cx="320" cy="120" r="30" fill="${accent}" opacity=".18"/>
    <circle cx="320" cy="120" r="16" fill="${accent}"/>
    <text x="320" y="182" font-family="Helvetica,Arial" font-size="14" font-weight="700" text-anchor="middle" fill="#1f1f1f">${title}</text>
    <rect x="252" y="198" width="136" height="7" rx="3.5" fill="#d7dbe3"/>
    <rect x="266" y="212" width="108" height="7" rx="3.5" fill="#d7dbe3"/>
    ${[0, 1, 2].map((i) => `<rect x="252" y="${238 + i * 30}" width="136" height="22" rx="7" fill="${i === step - 1 ? accent : '#f1f3f7'}" opacity="${i === step - 1 ? 0.2 : 1}"/>`).join('')}
    <rect x="252" y="340" width="136" height="28" rx="14" fill="${accent}"/>
    <text x="320" y="358" font-family="Helvetica,Arial" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">Continue</text>
    <text x="40" y="60" font-family="Helvetica,Arial" font-size="13" font-weight="700" fill="#5f6368">Step ${step}</text>
    <rect x="40" y="72" width="120" height="6" rx="3" fill="#d7dbe3"/><rect x="40" y="72" width="${step * 30}" height="6" rx="3" fill="${accent}"/>`,
  );
}

function chart(accent: string): string {
  const bars = [120, 180, 150, 220, 260, 240, 310];
  return svg(
    640,
    420,
    `<rect width="640" height="420" fill="#fff"/>
    <text x="40" y="54" font-family="Helvetica,Arial" font-size="20" font-weight="700" fill="#1f1f1f">Weekly activation</text>
    <text x="40" y="78" font-family="Helvetica,Arial" font-size="13" fill="#5f6368">+18% week over week</text>
    ${[0, 1, 2, 3].map((i) => `<line x1="40" x2="600" y1="${140 + i * 60}" y2="${140 + i * 60}" stroke="#eceff3"/>`).join('')}
    ${bars.map((b, i) => `<rect x="${60 + i * 78}" y="${360 - b * 0.7}" width="44" height="${b * 0.7}" rx="6" fill="${accent}" opacity="${0.45 + i * 0.08}"/>`).join('')}`,
  );
}

function blueprint(): string {
  return svg(
    640,
    420,
    `<rect width="640" height="420" fill="#1f4e79"/>
    <g stroke="#9cc3e6" stroke-width="1" opacity=".35">${Array.from({ length: 16 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="420"/>`).join('')}${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="640" y2="${i * 40}"/>`).join('')}</g>
    <g fill="none" stroke="#fff" stroke-width="3"><rect x="80" y="70" width="480" height="280"/><path d="M80 200 H300 V350"/><path d="M400 70 V180 H560"/><rect x="110" y="95" width="160" height="40"/><rect x="430" y="210" width="100" height="110" rx="6"/><circle cx="480" cy="265" r="22"/></g>
    <text x="90" y="390" font-family="Helvetica,Arial" font-size="14" fill="#fff" letter-spacing="2">KITCHEN — OPTION B · 1:50</text>`,
  );
}

function confetti(): string {
  const dots = Array.from({ length: 70 }, (_, i) => {
    const colors = ['#f28b82', '#fbbc04', '#34a853', '#4285f4', '#a142f4', '#ff6d01'];
    const x = (i * 97) % 640;
    const y = (i * 53) % 420;
    return `<rect x="${x}" y="${y}" width="10" height="5" rx="2" fill="${colors[i % colors.length]}" transform="rotate(${(i * 37) % 180} ${x} ${y})"/>`;
  }).join('');
  return svg(
    640,
    420,
    `<rect width="640" height="420" fill="#fff6ec"/>${dots}
    <circle cx="320" cy="210" r="92" fill="#fff" stroke="#f3d9bf" stroke-width="6"/>
    <text x="320" y="200" font-family="Georgia,serif" font-size="30" text-anchor="middle" fill="#6b3a2a">M &amp; J</text>
    <text x="320" y="236" font-family="Georgia,serif" font-size="15" text-anchor="middle" fill="#a0715a">forever</text>`,
  );
}

function portrait(hue: number): string {
  return svg(
    640,
    420,
    `<rect width="640" height="420" fill="hsl(${hue} 60% 86%)"/>
    <circle cx="320" cy="170" r="70" fill="hsl(${hue} 30% 45%)"/>
    <path d="M170 420 C180 300 460 300 470 420Z" fill="hsl(${hue} 30% 45%)"/>
    <circle cx="520" cy="80" r="30" fill="#fff" opacity=".6"/>`,
  );
}

export function previewSrc(att: Attachment): string | null {
  if (att.dataUrl) return att.dataUrl;
  const p = att.preview;
  if (!p) return null;
  if (PALETTES[p]) return landscape(p);
  if (p.startsWith('ui')) return uiMock(Number(p.slice(2)) || 1, '#0b57d0');
  if (p === 'chart') return chart('#0b57d0');
  if (p === 'blueprint') return blueprint();
  if (p === 'confetti') return confetti();
  if (p.startsWith('portrait')) return portrait(Number(p.slice(8)) || 200);
  return null;
}

function pdfEscape(s: string): string {
  return s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, '-');
}

export function buildPdf(title: string, lines: string[]): Blob {
  const content = [
    'BT /F1 22 Tf 60 760 Td (' + pdfEscape(title) + ') Tj ET',
    ...lines.map((l, i) => `BT /F1 12 Tf 60 ${720 - i * 20} Td (${pdfEscape(l)}) Tj ET`),
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    out += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}

export async function downloadAttachment(att: Attachment) {
  if (att.dataUrl) {
    const res = await fetch(att.dataUrl);
    downloadBlob(await res.blob(), att.name);
    return;
  }
  const kind = fileKind(att.name, att.type).kind;
  const src = previewSrc(att);
  if (kind === 'image' && src) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 640;
    canvas.height = img.naturalHeight || 420;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    canvas.toBlob((b) => b && downloadBlob(b, att.name.replace(/\.\w+$/, '.png')), 'image/png');
    return;
  }
  if (kind === 'pdf') {
    downloadBlob(
      buildPdf(att.name.replace(/\.pdf$/i, ''), [
        'This document was generated by the local demo mailbox.',
        `Original attachment: ${att.name}`,
        `Reported size: ${Math.round(att.size / 1024)} KB`,
        '',
        'No external services were contacted to produce this file.',
      ]),
      att.name,
    );
    return;
  }
  downloadBlob(
    new Blob([`${att.name}\n\nDemo attachment from the local mailbox.\nReported size: ${att.size} bytes\n`], { type: 'text/plain' }),
    `${att.name}.txt`,
  );
}
