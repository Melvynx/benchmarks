const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Collision-resistant 12-char id (no external dependency). */
export function newId(): string {
  let id = '';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
  return id;
}
