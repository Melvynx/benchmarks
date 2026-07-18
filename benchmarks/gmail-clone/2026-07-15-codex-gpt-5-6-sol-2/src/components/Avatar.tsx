import type { Contact } from '../domain/mail';
import { getInitials } from '../lib/format';

interface AvatarProps {
  contact: Contact;
  size?: 'small' | 'medium' | 'large';
}

export function Avatar({ contact, size = 'medium' }: AvatarProps) {
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ backgroundColor: contact.color }}
      aria-hidden="true"
    >
      {contact.avatar || getInitials(contact.name)}
    </span>
  );
}
