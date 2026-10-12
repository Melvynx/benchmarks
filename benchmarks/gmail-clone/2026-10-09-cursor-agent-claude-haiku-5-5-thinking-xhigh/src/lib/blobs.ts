import type { Attachment } from '../domain/types';

/** In-session file contents for attachments added through compose (not persisted). */
const blobs = new Map<string, Blob>();

export function registerBlob(id: string, blob: Blob): void {
  blobs.set(id, blob);
}

function placeholderImage(name: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#8ab4f8');
    gradient.addColorStop(1, '#c58af9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '600 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 600, 410);
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? new Blob()), 'image/png');
  });
}

export async function attachmentBlob(attachment: Attachment): Promise<Blob> {
  const existing = blobs.get(attachment.id);
  if (existing) return existing;
  if (attachment.kind === 'image') return placeholderImage(attachment.name);
  return new Blob([`Preview placeholder for ${attachment.name}\n`], { type: 'text/plain' });
}

export async function downloadAttachment(attachment: Attachment): Promise<void> {
  const blob = await attachmentBlob(attachment);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
