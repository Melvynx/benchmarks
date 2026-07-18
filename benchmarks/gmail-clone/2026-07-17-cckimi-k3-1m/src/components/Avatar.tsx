import { colorFor, initialsOf } from '../lib/utils';
import { displayName } from '../data/seed';

export function Avatar({ email, size = 32 }: { email: string; size?: number }) {
  const name = displayName(email);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: colorFor(email),
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden="true"
    >
      {initialsOf(name === 'me' ? 'Alex Carter' : name)}
    </span>
  );
}
