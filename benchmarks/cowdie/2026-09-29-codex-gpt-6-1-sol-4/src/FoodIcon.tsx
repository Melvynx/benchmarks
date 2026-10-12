import type { Food } from './pet-state';

export function FoodIcon({ food, size = 52 }: { food: Food; size?: number }) {
  if (food === 'carrot') return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M37 23C39 12 45 7 47 9C50 12 45 21 42 24C53 14 59 18 54 23C50 27 43 29 40 29" fill="#78a35e"/>
    <path d="M35 21C44 21 49 27 45 35C40 44 19 58 13 58C12 51 24 29 30 24C31 22 33 21 35 21Z" fill="#efa75b"/>
    <path d="M32 29L39 33M24 39L29 42M19 48L23 50" stroke="#d58a40" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M34 25C31 25 26 34 23 39" stroke="#ffc67a" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
  if (food === 'berry') return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M13 27C13 15 28 18 32 21C38 15 52 17 52 29C52 39 38 54 32 57C23 51 13 36 13 27Z" fill="#e28a94"/>
    <path d="M32 22C24 17 16 18 15 16L27 14L27 5L33 14L43 10L39 19L50 21L37 24L32 30L28 23L17 25L23 20" fill="#719961"/>
    <path d="M22 31L23 33M34 35L34 37M42 29L41 31M27 42L28 44M37 46L36 48" stroke="#ffe8b9" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M18 28C18 32 20 36 21 37" stroke="#f8b2b9" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M32 20C23 13 10 20 11 33C12 48 19 57 27 55C30 54 33 54 37 55C46 57 54 44 54 31C54 19 42 14 32 20Z" fill="#e7816b"/>
    <path d="M32 20C31 15 31 11 34 8" stroke="#7d6146" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M34 14C39 5 47 8 48 9C47 15 39 18 34 14Z" fill="#84a469"/>
    <path d="M18 29C16 33 18 42 21 44" stroke="#fbb5a0" strokeWidth="4" strokeLinecap="round"/>
  </svg>;
}
