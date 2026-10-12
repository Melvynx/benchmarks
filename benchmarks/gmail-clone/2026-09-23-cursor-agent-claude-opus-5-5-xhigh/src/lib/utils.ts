import type { LabelColor } from "./types";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

let counter = 0;
export function uid(prefix = "id") {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const AVATAR_COLORS = [
  "#1a73e8",
  "#d93025",
  "#188038",
  "#e37400",
  "#9334e6",
  "#c5221f",
  "#007b83",
  "#b06000",
  "#5f6368",
  "#a142f4",
  "#12b5cb",
  "#e52592",
  "#1e8e3e",
  "#3949ab",
];

export function avatarColor(key: string) {
  return AVATAR_COLORS[hash(key.toLowerCase()) % AVATAR_COLORS.length];
}

export const LABEL_COLORS: Record<
  LabelColor,
  { dot: string; bg: string; fg: string; bgDark: string; fgDark: string; name: string }
> = {
  gray: { name: "Gray", dot: "#8e918f", bg: "#e3e3e3", fg: "#444746", bgDark: "#444746", fgDark: "#e3e3e3" },
  red: { name: "Red", dot: "#e8453c", bg: "#fce8e6", fg: "#a50e0e", bgDark: "#5c1d18", fgDark: "#f6aea9" },
  orange: { name: "Orange", dot: "#f2994a", bg: "#feefe3", fg: "#b04d00", bgDark: "#5a3212", fgDark: "#fdc69c" },
  yellow: { name: "Yellow", dot: "#f4c20d", bg: "#fef7e0", fg: "#8a6100", bgDark: "#554300", fgDark: "#fde293" },
  green: { name: "Green", dot: "#34a853", bg: "#e6f4ea", fg: "#0d652d", bgDark: "#0f3d1f", fgDark: "#a8dab5" },
  teal: { name: "Teal", dot: "#12a4af", bg: "#e4f7fb", fg: "#00616b", bgDark: "#073d44", fgDark: "#8ee1ea" },
  blue: { name: "Blue", dot: "#4285f4", bg: "#e8f0fe", fg: "#174ea6", bgDark: "#1c3a6b", fgDark: "#aecbfa" },
  indigo: { name: "Indigo", dot: "#5c6bc0", bg: "#e8eaf6", fg: "#283593", bgDark: "#272d63", fgDark: "#c5cae9" },
  purple: { name: "Purple", dot: "#a142f4", bg: "#f3e8fd", fg: "#681da8", bgDark: "#43195f", fgDark: "#d7aefb" },
  pink: { name: "Pink", dot: "#e52592", bg: "#fde7f3", fg: "#9c166b", bgDark: "#5c1240", fgDark: "#fba9d6" },
};

export function isValidEmail(email: string) {
  return /^[^\s@<>(),;:]+@[^\s@<>(),;:]+\.[^\s@<>(),;:]{2,}$/.test(email.trim());
}

export function parseAddressList(input: string) {
  return input
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
      if (m) return { name: m[1].trim() || m[2].trim(), email: m[2].trim() };
      return { name: s, email: s };
    });
}

/** Strip scripts, event handlers and javascript: URLs from user-authored HTML. */
export function sanitizeHtml(html: string) {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,link,meta,style").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }
  });
  return doc.body.firstElementChild?.innerHTML ?? "";
}

export function attachmentKind(name: string, mime = "") {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "heic", "svg"].includes(ext)) return "image";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["doc", "docx", "txt", "rtf", "md", "pages"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv", "numbers"].includes(ext)) return "sheet";
  if (["ppt", "pptx", "key"].includes(ext)) return "slides";
  if (["zip", "rar", "7z", "gz", "tar"].includes(ext)) return "zip";
  if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  if (["fig", "sketch", "psd", "ai"].includes(ext)) return "design";
  if (["ics"].includes(ext)) return "calendar";
  return "other";
}

export type AttachmentKind = ReturnType<typeof attachmentKind>;

export const KIND_META: Record<AttachmentKind, { icon: string; color: string; label: string }> = {
  image: { icon: "image", color: "#d93025", label: "Image" },
  pdf: { icon: "picture_as_pdf", color: "#ea4335", label: "PDF" },
  doc: { icon: "description", color: "#4285f4", label: "Document" },
  sheet: { icon: "table_chart", color: "#0f9d58", label: "Spreadsheet" },
  slides: { icon: "slideshow", color: "#f4b400", label: "Presentation" },
  zip: { icon: "folder_zip", color: "#5f6368", label: "Archive" },
  audio: { icon: "audio_file", color: "#e37400", label: "Audio" },
  video: { icon: "movie", color: "#d93025", label: "Video" },
  design: { icon: "palette", color: "#a142f4", label: "Design file" },
  calendar: { icon: "event", color: "#1a73e8", label: "Calendar invite" },
  other: { icon: "draft", color: "#5f6368", label: "File" },
};

export function seededRandom(seed: string) {
  let h = hash(seed) || 1;
  return () => {
    h = (h * 16807) % 2147483647;
    return (h - 1) / 2147483646;
  };
}
