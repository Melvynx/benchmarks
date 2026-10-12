import type { Attachment } from "./types";
import { attachmentKind, seededRandom } from "./utils";

const svgCache = new Map<string, string>();

function hsl(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function landscape(seed: string) {
  const r = seededRandom(seed);
  const hue = 190 + r() * 60;
  const sunset = r() > 0.5;
  const sky1 = sunset ? hsl(20 + r() * 20, 90, 70) : hsl(hue, 70, 78);
  const sky2 = sunset ? hsl(280 + r() * 30, 50, 45) : hsl(hue + 10, 60, 55);
  const sunY = 150 + r() * 80;
  const layers = Array.from({ length: 3 }, (_, i) => {
    const base = 240 + i * 45;
    let d = `M0 ${base}`;
    for (let x = 0; x <= 800; x += 50) d += ` L${x} ${base - r() * (80 - i * 18)}`;
    d += " L800 600 L0 600 Z";
    return `<path d="${d}" fill="${hsl(hue + 40 - i * 12, 30 + i * 8, sunset ? 30 - i * 7 : 45 - i * 10)}" opacity="${0.75 + i * 0.1}"/>`;
  }).join("");
  const water = `<rect x="0" y="420" width="800" height="180" fill="${hsl(hue, 55, sunset ? 32 : 42)}"/>` +
    Array.from({ length: 14 }, () => `<rect x="${r() * 760}" y="${430 + r() * 160}" width="${20 + r() * 60}" height="2" rx="1" fill="#fff" opacity="${0.15 + r() * 0.3}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky2}"/><stop offset="1" stop-color="${sky1}"/></linearGradient></defs><rect width="800" height="600" fill="url(#s)"/><circle cx="${250 + r() * 300}" cy="${sunY}" r="${36 + r() * 20}" fill="#fff6d5" opacity=".9"/>${layers}${water}</svg>`;
}

function designMock(seed: string) {
  const r = seededRandom(seed);
  const accent = hsl(r() * 360, 70, 55);
  const soft = hsl(r() * 360, 60, 92);
  const cards = Array.from({ length: 3 }, (_, i) => {
    const x = 60 + i * 235;
    return `<g><rect x="${x}" y="300" width="210" height="220" rx="18" fill="#fff" stroke="#e5e7eb"/><circle cx="${x + 40}" cy="340" r="18" fill="${i === 1 ? accent : soft}"/><rect x="${x + 24}" y="380" width="150" height="12" rx="6" fill="#1f2937" opacity=".8"/><rect x="${x + 24}" y="404" width="120" height="10" rx="5" fill="#9ca3af"/><rect x="${x + 24}" y="422" width="160" height="10" rx="5" fill="#d1d5db"/><rect x="${x + 24}" y="470" width="80" height="28" rx="14" fill="${i === 1 ? accent : "#f3f4f6"}"/></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#f8fafc"/><rect x="0" y="0" width="800" height="56" fill="#fff"/><circle cx="36" cy="28" r="12" fill="${accent}"/><rect x="60" y="22" width="90" height="12" rx="6" fill="#111827"/><rect x="560" y="18" width="200" height="20" rx="10" fill="#f1f5f9"/><rect x="60" y="100" width="420" height="36" rx="8" fill="#111827"/><rect x="60" y="152" width="560" height="14" rx="7" fill="#94a3b8"/><rect x="60" y="176" width="480" height="14" rx="7" fill="#cbd5e1"/><rect x="60" y="220" width="140" height="40" rx="20" fill="${accent}"/><rect x="214" y="220" width="120" height="40" rx="20" fill="#fff" stroke="#e2e8f0"/><circle cx="660" cy="180" r="90" fill="${soft}"/><circle cx="700" cy="150" r="46" fill="${accent}" opacity=".85"/>${cards}${seed.includes("annotated") ? `<circle cx="300" cy="410" r="60" fill="none" stroke="#ef4444" stroke-width="5"/><path d="M360 380 L470 250" stroke="#ef4444" stroke-width="5"/><rect x="470" y="220" width="180" height="44" rx="8" fill="#ef4444"/><text x="486" y="248" font-family="Arial" font-size="16" fill="#fff">Add a back button</text>` : ""}</svg>`;
}

export function imagePreview(att: Attachment) {
  if (att.dataUrl && att.mime.startsWith("image/")) return att.dataUrl;
  const key = att.name;
  let url = svgCache.get(key);
  if (!url) {
    const svg = /^IMG_/i.test(att.name) ? landscape(att.name) : designMock(att.name);
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    svgCache.set(key, url);
  }
  return url;
}

export function prettyName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makePdf(title: string, lines: string[]) {
  const esc = (s: string) =>
    s
      .replace(/[—–]/g, "-")
      .replace(/→/g, "->")
      .replace(/·/g, "|")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[\\()]/g, (m) => `\\${m}`)
      .replace(/[^\x20-\x7e]/g, "");
  let content = `BT /F1 22 Tf 72 730 Td (${esc(title)}) Tj ET\n`;
  content += `0.85 0.85 0.85 RG 72 712 m 540 712 l S\n`;
  let y = 684;
  for (const l of lines) {
    content += `BT /F1 12 Tf 72 ${y} Td (${esc(l)}) Tj ET\n`;
    y -= 20;
  }
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
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

function svgToPng(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 1600;
      c.height = 1200;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function downloadAttachment(att: Attachment, context?: { sender?: string; subject?: string }) {
  if (att.dataUrl) {
    const blob = await (await fetch(att.dataUrl)).blob();
    return saveBlob(blob, att.name);
  }
  const kind = attachmentKind(att.name, att.mime);
  const base = att.name.replace(/\.[^.]+$/, "");
  if (kind === "image") {
    const blob = await svgToPng(imagePreview(att));
    return saveBlob(blob, `${base}.png`);
  }
  if (kind === "calendar") {
    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Mail Demo//EN\r\nBEGIN:VEVENT\r\nUID:${att.id}@mail.local\r\nSUMMARY:${context?.subject ?? prettyName(att.name)}\r\nDTSTART:${new Date(Date.now() + 2 * 86400000).toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\r\nDURATION:PT1H\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
    return saveBlob(new Blob([ics], { type: "text/calendar" }), att.name);
  }
  if (att.name.endsWith(".csv")) {
    const rows = ["cohort_week,users,week_1,week_2,week_4,week_8"];
    const r = seededRandom(att.name);
    for (let i = 0; i < 12; i++) {
      const u = 800 + Math.round(r() * 600);
      rows.push(`2026-W${String(20 + i).padStart(2, "0")},${u},${(0.6 + r() * 0.2).toFixed(2)},${(0.45 + r() * 0.15).toFixed(2)},${(0.35 + r() * 0.1).toFixed(2)},${(0.28 + r() * 0.08).toFixed(2)}`);
    }
    return saveBlob(new Blob([rows.join("\n")], { type: "text/csv" }), att.name);
  }
  const lines: string[] = [];
  if (context?.sender) lines.push(`Shared by ${context.sender}`, "");
  for (const s of documentSections(att.name)) lines.push(s.heading, ...s.lines.map((l) => `    ${l}`), "");
  return saveBlob(makePdf(prettyName(att.name), lines), kind === "pdf" ? att.name : `${base}.pdf`);
}

export interface DocSection {
  heading: string;
  lines: string[];
}

const DOCS: Record<string, DocSection[]> = {
  "Atlas_Launch_Checklist.pdf": [
    { heading: "Feature flags", lines: ["atlas_v2_workspace: 100% internal, 20% beta, ramp to GA Thursday 10:00", "atlas_ai_summaries: stays at beta cohort until eval pass rate > 92%", "Owner: Jordan Brooks"] },
    { heading: "Rollback plan", lines: ["Flip atlas_v2_workspace off in the admin console (< 2 min)", "Migrations are additive; no down-migration required", "Owner on call: Diego Alvarez, backup Jordan Brooks"] },
    { heading: "Support readiness", lines: ["Macros for top 12 questions published in the help desk", "Hero articles live: Getting started, Importing, Sharing", "Owner: Hannah Kim"] },
    { heading: "Status page & comms", lines: ["Status page component 'Atlas' created, subscribers notified", "Launch email scheduled Thursday 9:00 — pending Avery's confirmation", "Go/no-go: Wednesday 3pm, Room 4B"] },
  ],
  "Q4_Offsite_Agenda.docx": [
    { heading: "Day 1 — Tuesday, Oct 28", lines: ["09:30  Coffee & arrivals", "10:00  2026 retrospective (Avery)", "13:00  Customer panel: three Atlas beta teams", "16:00  Strategy breakouts"] },
    { heading: "Day 2 — Wednesday, Oct 29", lines: ["09:30  Roadmap bets for H1", "11:30  Hiring plan & team structure", "14:00  Commitments and owners", "16:30  Wrap and travel"] },
    { heading: "Logistics", lines: ["Venue: The Foundry, Sonoma — shuttle from office 8:00", "Dietary requests to Sofia by Oct 14", "Budget owner: People Ops"] },
  ],
  "Invoice_0147_StudioOrbit.pdf": [
    { heading: "Bill to", lines: ["Lumen Labs, Inc. — Attn: Avery Chen", "Invoice #0147 · Issued Sep 22, 2026 · Due Oct 22, 2026"] },
    { heading: "Line items", lines: ["Help center illustration system (10 spots)   $6,400.00", "Hero illustration v1–v3 revisions              $1,800.00", "Source files & export presets                     $400.00"] },
    { heading: "Total due: $8,600.00", lines: ["Net 30 · ACH or wire to Studio Orbit LLC", "Thank you for the collaboration!"] },
  ],
  "Lease_Renewal_2027_Unit3B.pdf": [
    { heading: "Term", lines: ["Renewal period: January 1, 2027 – December 31, 2027", "Premises: 1188 Fell St, Unit 3B"] },
    { heading: "Rent", lines: ["Monthly rent: $2,840 (+3%, below the city cap)", "Due on the 1st; 5-day grace period"] },
    { heading: "Options", lines: ["12-month renewal at the rate above", "Month-to-month available at a higher rate", "Please sign and return by November 15, 2026"] },
    { heading: "Signatures", lines: ["Tenant: ______________________   Date: __________", "Landlord: Greg Paulson, Paulson Properties"] },
  ],
  "Miso_Vaccination_Record.pdf": [
    { heading: "Patient", lines: ["Miso · Domestic shorthair · 4 yrs · 4.6 kg", "Owner: Avery Chen"] },
    { heading: "Vaccinations", lines: ["FVRCP — Sep 19, 2026 — next due Sep 2029", "Rabies (3-year) — Sep 19, 2026 — next due Sep 2029", "FeLV — Sep 19, 2026 — next due Sep 2027"] },
    { heading: "Notes", lines: ["Healthy weight, teeth look great. Recheck dental at next annual."] },
  ],
  "Lumen_Brand_Concepts_v1.pdf": [
    { heading: "Concept A — Arc", lines: ["A single continuous stroke that bends into the 'L'", "Warm neutrals with a signal orange accent"] },
    { heading: "Concept B — Signal", lines: ["Dot-and-ring mark referencing notifications", "High-contrast palette for product surfaces"] },
    { heading: "Concept C — Paper Lantern", lines: ["Soft geometric lantern form, friendly and approachable", "Recommended direction for further exploration"] },
  ],
  "Brightwater_Bill_Sep2026.pdf": [
    { heading: "Account summary", lines: ["Account 4471-2290-18 · Service address 1188 Fell St, Unit 3B", "Billing period Aug 15 – Sep 14, 2026"] },
    { heading: "Usage", lines: ["Electricity: 312 kWh (−9% vs last month)", "Peak hours: 38% · Off-peak: 62%"] },
    { heading: "Amount due: $84.12", lines: ["Due October 18, 2026 · Autopay is ON (card ending 0921)"] },
  ],
  "E-ticket_SK4821_QX7R2P.pdf": [
    { heading: "Passenger", lines: ["CHEN / AVERY MS · Confirmation QX7R2P", "Ticket 016 2384 9918 20"] },
    { heading: "Itinerary", lines: ["SK 4821  SFO → LIS  Fri, Oct 17  3:45 PM → 11:20 AM (+1)  Seat 24A", "SK 4822  LIS → SFO  Wed, Oct 22  1:10 PM → 4:35 PM  Seat 22C"] },
    { heading: "Baggage", lines: ["1 checked bag up to 23 kg · 1 carry-on + personal item"] },
  ],
  "Atlas_Beta_Survey_Results.pdf": [
    { heading: "Summary", lines: ["412 responses from 63 beta workspaces (38% response rate)", "NPS 47 (+9 vs alpha)"] },
    { heading: "Top requests", lines: ["1. Offline mode for the desktop app (31%)", "2. Bulk import from spreadsheets (24%)", "3. Granular sharing permissions (19%)"] },
    { heading: "Quotes", lines: ["“The empty states actually teach you the product.”", "“Summaries saved our Monday standup.”"] },
  ],
  "Move-in_Checklist_3B.pdf": [
    { heading: "Before move-in", lines: ["Walk-through photos of every room", "Test smoke and CO detectors"] },
    { heading: "Keys & access", lines: ["2 unit keys, 1 mailbox key, 2 garage fobs", "Building door code changes quarterly"] },
    { heading: "Utilities", lines: ["Electric: Brightwater Energy — transfer to your name before the 1st", "Internet: building fiber, activation takes 2 business days"] },
  ],
};

export function documentSections(name: string): DocSection[] {
  if (DOCS[name]) return DOCS[name];
  const title = prettyName(name);
  return [
    { heading: "Overview", lines: [`${title} — shared for review.`, "Summary of goals, scope, and current status."] },
    { heading: "Key points", lines: ["Decisions made so far and the reasoning behind them", "Open questions that need an owner"] },
    { heading: "Next steps", lines: ["Review and leave comments by end of week", "Final version to follow after feedback"] },
  ];
}

export function fakeArchiveEntries(name: string) {
  const r = seededRandom(name);
  const base = prettyName(name).toLowerCase().replace(/\s+/g, "-");
  return Array.from({ length: 10 }, (_, i) => ({
    name: `${base}/${["billing", "search", "security", "teams", "api", "mobile", "onboarding", "reports", "exports", "support"][i]}${r() > 0.5 ? ".svg" : "@2x.png"}`,
    size: Math.round(40_000 + r() * 900_000),
  }));
}
