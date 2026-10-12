const HEADS = [
  "Mo", "Pi", "Bu", "Lu", "Ki", "Po", "Nu", "Bo", "Mi", "Zu",
  "Fe", "Ri", "Da", "Ko", "Wu", "Ti", "Su", "Ya", "Jo", "Pe",
  "Ba", "Chu", "No", "Gi", "Ho",
];
const TAILS = [
  "chi", "p", "bble", "mo", "ki", "nko", "do", "lly", "to", "mi",
  "zu", "sh", "na", "ro", "bu", "n", "ffy", "co", "pple", "nky",
];

export function blobName(id: number, seed: number): string {
  const h = Math.imul(id + 1, 2654435761) ^ Math.imul(seed + 17, 40503);
  const a = (h >>> 0) % HEADS.length;
  const b = ((h >>> 8) >>> 0) % TAILS.length;
  return HEADS[a] + TAILS[b];
}
