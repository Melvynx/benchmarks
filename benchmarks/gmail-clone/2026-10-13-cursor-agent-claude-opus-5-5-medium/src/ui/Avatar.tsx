import type { Contact } from "../types";
import { initials } from "../lib/format";

export function Avatar({ contact, size = 40, onClick, className }: { contact: Contact; size?: number; onClick?: (e: React.MouseEvent) => void; className?: string }) {
  return (
    <span
      className={"avatar " + (className ?? "")}
      style={{ width: size, height: size, background: contact.color, fontSize: size * 0.45 }}
      onClick={onClick}
      aria-hidden="true"
    >
      {initials(contact.name)}
    </span>
  );
}
