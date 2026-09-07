import type { Label } from '@/lib/types'

/** Gmail's label swatch set — background paired with a legible foreground. */
export const LABEL_PALETTE: { bg: string; fg: string }[] = [
  { bg: '#e8eaed', fg: '#3c4043' },
  { bg: '#f28b82', fg: '#3c1210' },
  { bg: '#fbbc04', fg: '#3d2f00' },
  { bg: '#fff475', fg: '#3d3a00' },
  { bg: '#ccff90', fg: '#20340a' },
  { bg: '#a7ffeb', fg: '#0b3b33' },
  { bg: '#cbf0f8', fg: '#0d3b45' },
  { bg: '#aecbfa', fg: '#0b2a5c' },
  { bg: '#d7aefb', fg: '#2f0d52' },
  { bg: '#fdcfe8', fg: '#4c0c30' },
  { bg: '#e6c9a8', fg: '#3f2a12' },
  { bg: '#1a73e8', fg: '#ffffff' },
  { bg: '#188038', fg: '#ffffff' },
  { bg: '#d93025', fg: '#ffffff' },
  { bg: '#9334e6', fg: '#ffffff' },
  { bg: '#e37400', fg: '#ffffff' },
]

export const SEED_LABELS: Label[] = [
  { id: 'lb-work', name: 'Work', color: { bg: '#aecbfa', fg: '#0b2a5c' }, favorite: true },
  { id: 'lb-personal', name: 'Personal', color: { bg: '#ccff90', fg: '#20340a' }, favorite: true },
  { id: 'lb-follow', name: 'Follow up', color: { bg: '#f28b82', fg: '#3c1210' }, favorite: true },
  { id: 'lb-travel', name: 'Travel', color: { bg: '#a7ffeb', fg: '#0b3b33' } },
  { id: 'lb-finance', name: 'Finance', color: { bg: '#d7aefb', fg: '#2f0d52' } },
  { id: 'lb-receipts', name: 'Receipts', color: { bg: '#e6c9a8', fg: '#3f2a12' } },
  { id: 'lb-reading', name: 'Reading list', color: { bg: '#fff475', fg: '#3d3a00' } },
  { id: 'lb-recruiting', name: 'Recruiting', color: { bg: '#fdcfe8', fg: '#4c0c30' } },
]
