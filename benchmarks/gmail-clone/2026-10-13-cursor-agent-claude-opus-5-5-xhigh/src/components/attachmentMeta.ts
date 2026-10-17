import type { AttachmentKind } from "../lib/types";
import type { IconKey } from "./ui";

export const KIND_ICON: Record<AttachmentKind, { icon: IconKey; color: string; label: string }> = {
  pdf: { icon: "picture_as_pdf", color: "#d93025", label: "PDF" },
  image: { icon: "image", color: "#d93025", label: "Image" },
  sheet: { icon: "table_chart", color: "#188038", label: "Spreadsheet" },
  doc: { icon: "description", color: "#1a73e8", label: "Document" },
  calendar: { icon: "event", color: "#1a73e8", label: "Calendar invite" },
  text: { icon: "description", color: "#5f6368", label: "Text" },
  zip: { icon: "folder_zip", color: "#5f6368", label: "Archive" },
  audio: { icon: "audio_file", color: "#e37400", label: "Audio" },
  video: { icon: "movie", color: "#d93025", label: "Video" },
  other: { icon: "attach_file", color: "#5f6368", label: "File" },
};
