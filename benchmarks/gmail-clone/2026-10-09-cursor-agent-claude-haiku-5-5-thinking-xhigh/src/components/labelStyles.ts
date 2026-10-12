import type { LabelColor } from '../domain/types';

export const LABEL_DOT: Record<LabelColor, string> = {
  blue: 'bg-[#1a73e8]',
  red: 'bg-[#d93025]',
  green: 'bg-[#188038]',
  amber: 'bg-[#f29900]',
  violet: 'bg-[#8430ce]',
  pink: 'bg-[#d01884]',
  teal: 'bg-[#129eaf]',
  slate: 'bg-[#5f6368]',
};

export const LABEL_CHIP: Record<LabelColor, string> = {
  blue: 'bg-[#d3e3fd] text-[#0842a0] dark:bg-[#1f3a5f] dark:text-[#a8c7fa]',
  red: 'bg-[#fce8e6] text-[#a50e0e] dark:bg-[#5c2b29] dark:text-[#f2b8b5]',
  green: 'bg-[#c4eed0] text-[#0d652d] dark:bg-[#1e4d2b] dark:text-[#a8dab5]',
  amber: 'bg-[#feefc3] text-[#5a4300] dark:bg-[#5c4a1b] dark:text-[#fdd663]',
  violet: 'bg-[#e8d5fb] text-[#5f2e9d] dark:bg-[#3f2a5c] dark:text-[#d7aefb]',
  pink: 'bg-[#ffd8ec] text-[#8c1d5b] dark:bg-[#5c2044] dark:text-[#ffb6dc]',
  teal: 'bg-[#c4f0f4] text-[#0c5b63] dark:bg-[#18474d] dark:text-[#9de6ee]',
  slate: 'bg-[#e8eaed] text-[#3c4043] dark:bg-[#3c4043] dark:text-[#e8eaed]',
};
