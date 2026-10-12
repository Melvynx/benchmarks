import type { Attachment } from "./types";

function pdfEscape(value: string): string {
  return value.replace(/[()\\]/g, " ").replace(/[^\x20-\x7E]/g, " ").slice(0, 90);
}

function buildPdf(title: string, text: string): string {
  const lines = [title, "", ...text.split("\n")].slice(0, 28).map(pdfEscape);
  const stream = lines.map((line, index) => `BT /F1 12 Tf 64 ${740 - index * 18} Td (${line}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(out.length);
    out += obj;
  }
  const xrefAt = out.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  out += xref;
  out += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return out;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadAttachment(attachment: Attachment) {
  if (attachment.dataUrl) {
    const link = document.createElement("a");
    link.href = attachment.dataUrl;
    link.download = attachment.filename;
    link.click();
    return;
  }
  if (attachment.mime === "application/pdf") {
    saveBlob(new Blob([buildPdf(attachment.filename, attachment.text ?? "Local mailbox preview")], { type: "application/pdf" }), attachment.filename);
    return;
  }
  const type = attachment.mime.startsWith("text/") || attachment.filename.endsWith(".csv") ? attachment.mime || "text/plain" : "text/plain";
  saveBlob(new Blob([attachment.text ?? `Preview of ${attachment.filename}`], { type }), attachment.filename);
}

export async function readLocalFiles(files: File[]): Promise<{ ok: Attachment[]; skipped: string[] }> {
  const ok: Attachment[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    if (file.size > 400_000) {
      skipped.push(file.name);
      continue;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    let text: string | undefined;
    if (file.type.startsWith("text/") || /\.(csv|md|txt|json)$/i.test(file.name)) text = await file.text();
    ok.push({
      id: crypto.randomUUID(),
      filename: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
      text,
    });
  }
  return { ok, skipped };
}
