import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { Attachment, Invite } from "./types";
import { hashString } from "./utils";

/* ---------- Seeded artwork ---------- */

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export type ArtVariant = "landscape" | "ocean" | "ui" | "chart" | "banner" | "portrait";

export function artSvg(hue: number, variant: ArtVariant = "landscape", label = "") {
  const r = rng(hue * 97 + label.length * 13 + 7);
  const h = (n: number) => ((hue + n) % 360 + 360) % 360;
  const W = 400;
  const H = 260;
  if (variant === "ui") {
    const cards = Array.from({ length: 6 }, (_, i) => {
      const x = 118 + (i % 3) * 92;
      const y = 62 + Math.floor(i / 3) * 96;
      return `<rect x='${x}' y='${y}' width='80' height='84' rx='8' fill='#fff' stroke='hsl(${h(0)},20%,88%)'/><rect x='${x + 8}' y='${y + 8}' width='64' height='38' rx='5' fill='hsl(${h(i * 25)},70%,${80 + r() * 8}%)'/><rect x='${x + 8}' y='${y + 54}' width='${40 + r() * 20}' height='6' rx='3' fill='hsl(${h(0)},10%,70%)'/><rect x='${x + 8}' y='${y + 66}' width='${24 + r() * 20}' height='6' rx='3' fill='hsl(${h(0)},10%,82%)'/>`;
    }).join("");
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'><rect width='${W}' height='${H}' fill='hsl(${h(0)},30%,96%)'/><rect x='0' y='0' width='${W}' height='40' fill='#fff'/><circle cx='22' cy='20' r='9' fill='hsl(${h(0)},70%,55%)'/><rect x='40' y='15' width='70' height='10' rx='5' fill='hsl(${h(0)},10%,80%)'/><rect x='150' y='11' width='160' height='18' rx='9' fill='hsl(${h(0)},30%,93%)'/><rect x='0' y='40' width='104' height='${H - 40}' fill='hsl(${h(0)},35%,93%)'/>${[0, 1, 2, 3, 4].map((i) => `<rect x='14' y='${58 + i * 24}' width='${50 + r() * 26}' height='10' rx='5' fill='hsl(${h(0)},${i === 0 ? 70 : 15}%,${i === 0 ? 60 : 78}%)'/>`).join("")}${cards}</svg>`;
  }
  if (variant === "chart") {
    const bars = Array.from({ length: 9 }, (_, i) => {
      const bh = 40 + r() * 130;
      return `<rect x='${48 + i * 36}' y='${220 - bh}' width='22' height='${bh}' rx='4' fill='hsl(${h(i * 6)},65%,${52 + (i % 3) * 8}%)'/>`;
    }).join("");
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'><rect width='${W}' height='${H}' fill='#fff'/><text x='24' y='34' font-family='Arial' font-size='16' font-weight='bold' fill='#202124'>${label}</text>${[0, 1, 2, 3].map((i) => `<line x1='40' x2='380' y1='${220 - i * 45}' y2='${220 - i * 45}' stroke='#e8eaed'/>`).join("")}${bars}</svg>`;
  }
  if (variant === "banner") {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 260'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${h(0)},70%,45%)'/><stop offset='1' stop-color='hsl(${h(40)},75%,62%)'/></linearGradient></defs><rect width='600' height='260' fill='url(#g)'/><circle cx='${460 + r() * 60}' cy='${70 + r() * 40}' r='${60 + r() * 30}' fill='hsl(${h(60)},90%,85%)' opacity='.5'/><path d='M0 200 Q150 ${140 + r() * 30} 300 190 T600 170 V260 H0Z' fill='hsl(${h(-20)},45%,30%)' opacity='.45'/><path d='M0 230 Q200 ${190 + r() * 20} 380 225 T600 215 V260 H0Z' fill='hsl(${h(-30)},50%,22%)' opacity='.6'/></svg>`;
  }
  if (variant === "portrait") {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'><rect width='${W}' height='${H}' fill='hsl(${h(0)},45%,82%)'/><circle cx='200' cy='110' r='48' fill='hsl(${h(20)},35%,62%)'/><path d='M96 260 Q200 150 304 260Z' fill='hsl(${h(200)},35%,45%)'/></svg>`;
  }
  const peaks = (base: number, amp: number, n: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) pts.push(`${(i / n) * W},${base - r() * amp}`);
    return `M0 ${H} L${pts.join(" L")} L${W} ${H}Z`;
  };
  const sky = variant === "ocean"
    ? `<stop offset='0' stop-color='hsl(${h(10)},75%,70%)'/><stop offset='.6' stop-color='hsl(${h(40)},85%,82%)'/>`
    : `<stop offset='0' stop-color='hsl(${h(0)},65%,68%)'/><stop offset='1' stop-color='hsl(${h(35)},80%,86%)'/>`;
  const ground = variant === "ocean"
    ? `<rect y='170' width='${W}' height='90' fill='hsl(${h(180)},45%,40%)'/><path d='M0 170 H${W}' stroke='hsl(${h(40)},90%,90%)' stroke-width='2' opacity='.7'/>${Array.from({ length: 7 }, (_, i) => `<path d='M${r() * W} ${185 + i * 10} h${30 + r() * 60}' stroke='#fff' stroke-width='2' opacity='.35' stroke-linecap='round'/>`).join("")}<path d='${peaks(175, 40, 5)}' fill='hsl(${h(200)},25%,32%)' opacity='.9' transform='translate(0,-5) scale(1,.6) translate(0,90)'/>`
    : `<path d='${peaks(170, 80, 6)}' fill='hsl(${h(200)},22%,52%)'/><path d='${peaks(205, 50, 8)}' fill='hsl(${h(160)},28%,36%)'/><path d='${peaks(240, 25, 10)}' fill='hsl(${h(140)},30%,24%)'/>`;
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'>${sky}</linearGradient></defs><rect width='${W}' height='${H}' fill='url(#s)'/><circle cx='${80 + r() * 240}' cy='${50 + r() * 50}' r='${18 + r() * 18}' fill='hsl(${h(50)},100%,94%)' opacity='.95'/>${ground}</svg>`;
}

export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function imageVariantFor(att: Attachment): ArtVariant {
  const n = att.name.toLowerCase();
  if (/(screen|mock|nav|ui|explor|design|wireframe)/.test(n)) return "ui";
  if (/(chart|timeline|graph|metrics)/.test(n)) return "chart";
  if (/(beach|ocean|sea|coast|pier)/.test(n)) return "ocean";
  if (/(headshot|portrait|profile)/.test(n)) return "portrait";
  return "landscape";
}

export function attachmentArt(att: Attachment) {
  const hue = att.seed?.hue ?? hashString(att.name) % 360;
  return svgDataUrl(artSvg(hue, imageVariantFor(att), att.seed?.title || ""));
}

/* ---------- Real file generation for downloads ---------- */

function pdfEscape(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "*")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/[\\()]/g, (m) => `\\${m}`);
}

function wrap(text: string, width: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if ((line + " " + word).trim().length > width) {
        out.push(line.trim());
        line = word;
      } else line += " " + word;
    }
    out.push(line.trim());
  }
  return out;
}

export function makePdf(title: string, lines: string[]) {
  let y = 740;
  let stream = `0.11 0.45 0.91 rg 56 770 500 4 re f\nBT /F2 22 Tf 0.12 0.12 0.12 rg 56 ${y} Td (${pdfEscape(title)}) Tj ET\n`;
  y -= 34;
  for (const line of lines.flatMap((l) => (l === "" ? [""] : wrap(l, 92)))) {
    if (y < 56) break;
    const heading = line.startsWith("## ");
    const txt = heading ? line.slice(3) : line;
    stream += `BT /${heading ? "F2" : "F1"} ${heading ? 13 : 11} Tf 0.2 0.2 0.2 rg 56 ${y} Td (${pdfEscape(txt)}) Tj ET\n`;
    y -= heading ? 22 : 16;
  }
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

const icsDate = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function makeIcs(inv: Invite) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Local Mail//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${hashString(inv.title + inv.start)}@local.mail`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(inv.start)}`,
    `DTEND:${icsDate(inv.end)}`,
    `SUMMARY:${inv.title}`,
    inv.location ? `LOCATION:${inv.location}` : "",
    `ORGANIZER;CN=${inv.organizer.name}:mailto:${inv.organizer.email}`,
    ...inv.guests.map((g) => `ATTENDEE;CN=${g.name}:mailto:${g.email}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return new Blob([lines.join("\r\n")], { type: "text/calendar" });
}

async function svgToRaster(svg: string, type: "image/jpeg" | "image/png") {
  const img = new Image();
  img.src = svgDataUrl(svg);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1040;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), type, 0.92));
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Minimal store-only ZIP writer (no compression). */
export function makeZip(files: { name: string; data: Uint8Array }[]) {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, f.data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, f.data.length, true);
    cd.setUint32(24, f.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: "application/zip" });
}

export async function attachmentBlob(att: Attachment, invite?: Invite): Promise<Blob | null> {
  if (att.blobKey) return (await idbGet<Blob>(att.blobKey)) ?? null;
  const seed = att.seed;
  switch (att.kind) {
    case "image": {
      const hue = seed?.hue ?? hashString(att.name) % 360;
      const svg = artSvg(hue, imageVariantFor(att), seed?.title || "");
      return svgToRaster(svg, /\.png$/i.test(att.name) ? "image/png" : "image/jpeg");
    }
    case "pdf":
    case "doc":
      return makePdf(seed?.title || att.name.replace(/\.[^.]+$/, ""), seed?.lines || []);
    case "sheet": {
      const csv = (seed?.rows || []).map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
      return new Blob([csv], { type: "text/csv" });
    }
    case "calendar":
      return invite ? makeIcs(invite) : new Blob(["BEGIN:VCALENDAR\r\nEND:VCALENDAR"], { type: "text/calendar" });
    case "text":
      return new Blob([(seed?.lines || []).join("\n")], { type: "text/plain" });
    case "zip": {
      const enc = new TextEncoder();
      const base = (seed?.hue ?? 200) % 360;
      const files = Array.from({ length: 6 }, (_, i) => ({
        name: `${att.name.replace(/\.zip$/i, "")}/illustration-${String(i + 1).padStart(2, "0")}.svg`,
        data: enc.encode(artSvg((base + i * 47) % 360, i % 2 ? "landscape" : "ocean")),
      }));
      files.push({ name: `${att.name.replace(/\.zip$/i, "")}/README.txt`, data: enc.encode(`${att.name}\nGenerated locally by the mail client.\n`) });
      return makeZip(files);
    }
    default:
      return null;
  }
}

export async function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- User uploads ---------- */

export async function storeUpload(key: string, file: Blob) {
  await idbSet(key, file);
}

export async function loadUpload(key: string) {
  return (await idbGet<Blob>(key)) ?? null;
}

export async function removeUpload(key: string) {
  await idbDel(key).catch(() => undefined);
}

export function isBlockedAttachment(att: Attachment, inSpam: boolean) {
  return inSpam && /\.(zip|exe|scr|js|bat|rar)$/i.test(att.name) && !att.blobKey;
}
