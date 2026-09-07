import type { ReactNode } from "react";

export function Icon({ d, size = 16 }: { d: string; size?: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  select: "M4 4l8 16 2-7 7-2z",
  hand: "M8 11V7a1 1 0 012 0v4M10 10V6a1 1 0 012 0v4m0 0V7a1 1 0 012 0v5m0 0V8a1 1 0 012 0v8a4 4 0 01-4 4H9a4 4 0 01-4-4v-5a1 1 0 012 0",
  frame: "M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4M9 9h6v6H9z",
  rect: "M5 5h14v14H5z",
  ellipse: "M12 5a7 7 0 110 14 7 7 0 010-14z",
  line: "M5 19L19 5",
  pen: "M4 20l4.5-1.5L19 8l-3-3L5.5 15.5z",
  text: "M5 7h14M12 7v12M8 19h8",
  star: "M12 3l2.4 6.6H21l-5.4 4.2 2 6.2L12 16.5 6.4 20l2-6.2L3 9.6h6.6z",
  polygon: "M12 3l8 6-3 10H7L4 9z",
  comment: "M5 6h14v10H8l-3 3z",
  proto: "M5 12h14M13 6l6 6-6 6",
  zoom: "M11 5a6 6 0 100 12 6 6 0 000-12zM20 20l-4-4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  lock: "M8 11V8a4 4 0 118 0v3M6 11h12v9H6z",
} as const;
