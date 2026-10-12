import type { SVGProps } from "react";
import type { FoodId, StatKey } from "../game/content";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true,
  ...rest,
});

export const IconHeart = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill="currentColor" />
  </svg>
);

export const IconBolt = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M13.5 2.5 5.5 13.2h5.3l-1.3 8.3 8-10.8h-5.3l1.3-8.2Z" fill="currentColor" strokeLinejoin="round" />
  </svg>
);

export const IconDrop = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 3s6.5 7 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3Z" fill="currentColor" />
    <path d="M9 14.5a3 3 0 0 0 2.5 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
  </svg>
);

export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="3" width="18" height="18" rx="6" fill="currentColor" />
    <path d="M12 8v8M8 12h8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

export const IconLeaf = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 12c-3.2-.4-5.5-3-5-6.2 3.2-.4 5.6 2 5 6.2Zm0 0c.4-3.2 3-5.5 6.2-5 .4 3.2-2 5.6-6.2 5Zm0 0c3.2.4 5.5 3 5 6.2-3.2.4-5.6-2-5-6.2Z" fill="currentColor" />
    <path d="M12 12c-1 3-2.5 5.5-5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const STAT_ICON: Record<StatKey, (p: P) => React.ReactElement> = {
  hunger: IconLeaf,
  happy: IconHeart,
  energy: IconBolt,
  hygiene: IconDrop,
  health: IconPlus,
};

export const IconFeed = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 7.2c-1.5-1.3-4.6-1.5-6 .7-1.8 2.8-.3 8.6 2.6 10.8 1.3 1 2.3.6 3.4.1 1.1.5 2.1.9 3.4-.1 2.9-2.2 4.4-8 2.6-10.8-1.4-2.2-4.5-2-6-.7Z" fill="currentColor" />
    <path d="M12 7.3c0-1.6.6-3 2-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M13.2 4.6c1.6-1 3.3-.7 4.2.2-1 1.2-2.8 1.4-4.2-.2Z" fill="currentColor" opacity=".7" />
    <ellipse cx="8.6" cy="10.4" rx="1.2" ry="1.9" fill="#fff" opacity=".45" transform="rotate(20 8.6 10.4)" />
  </svg>
);

export const IconBall = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="8.5" fill="currentColor" />
    <path d="M12 3.5c-3 2.5-3 14.5 0 17M12 3.5c3 2.5 3 14.5 0 17M3.6 10.5c5.5 1.5 11.3 1.5 16.8 0" stroke="#fff" strokeWidth="1.5" opacity=".75" />
  </svg>
);

export const IconBubbles = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="9.5" cy="13.5" r="6" fill="currentColor" />
    <circle cx="17" cy="8" r="3.6" fill="currentColor" opacity=".75" />
    <circle cx="17.5" cy="17" r="2.2" fill="currentColor" opacity=".55" />
    <path d="M6.8 11.4a3.2 3.2 0 0 1 2.6-1.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IconMoon = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" fill="currentColor" />
    <circle cx="17.5" cy="5.5" r="1.1" fill="currentColor" opacity=".7" />
    <circle cx="20.3" cy="9" r=".8" fill="currentColor" opacity=".6" />
  </svg>
);

export const IconSun = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="4.6" fill="currentColor" />
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <path
          key={i}
          d={`M${12 + Math.cos(a) * 7} ${12 + Math.sin(a) * 7}L${12 + Math.cos(a) * 9.4} ${12 + Math.sin(a) * 9.4}`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);

export const IconPill = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <g transform="rotate(-40 12 12)">
      <rect x="4" y="8" width="16" height="8" rx="4" fill="#fff" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 8h4v8H8a4 4 0 0 1 0-8Z" fill="currentColor" />
    </g>
  </svg>
);

export const IconBow = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 12 4.5 7.2c-1-.6-2.2.1-2.2 1.3v7c0 1.2 1.2 1.9 2.2 1.3L12 12Zm0 0 7.5-4.8c1-.6 2.2.1 2.2 1.3v7c0 1.2-1.2 1.9-2.2 1.3L12 12Z" fill="currentColor" />
    <rect x="9.8" y="9.6" width="4.4" height="4.8" rx="1.8" fill="currentColor" stroke="#fff" strokeWidth="1.2" />
  </svg>
);

export const IconGear = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path
      d="M10.3 3.5h3.4l.5 2.2 1.6.9 2.1-.8 1.7 2.9-1.7 1.5v1.8l1.7 1.5-1.7 2.9-2.1-.8-1.6.9-.5 2.2h-3.4l-.5-2.2-1.6-.9-2.1.8-1.7-2.9 1.7-1.5v-1.8L4.4 8.7l1.7-2.9 2.1.8 1.6-.9.5-2.2Z"
      fill="currentColor"
    />
    <circle cx="12" cy="12" r="2.6" fill="#fff" />
  </svg>
);

export const IconSound = ({ size, off, ...p }: P & { off?: boolean }) => (
  <svg {...base(size, p)}>
    <path d="M4 9.5h3l4.5-3.8v12.6L7 14.5H4z" fill="currentColor" strokeLinejoin="round" />
    {off ? (
      <path d="m15.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path d="M15 9a4.2 4.2 0 0 1 0 6M17.6 6.4a8 8 0 0 1 0 11.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    )}
  </svg>
);

export const IconMusic = ({ size, off, ...p }: P & { off?: boolean }) => (
  <svg {...base(size, p)}>
    <path d="M9 17.5V6.2l10-2.2v11.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <ellipse cx="6.8" cy="17.6" rx="2.6" ry="2.1" fill="currentColor" />
    <ellipse cx="16.8" cy="15.4" rx="2.6" ry="2.1" fill="currentColor" />
    {off && <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
  </svg>
);

export const IconLock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor" />
    <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);

export const IconStar = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="m12 3.2 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.2Z" fill="currentColor" strokeLinejoin="round" />
  </svg>
);

export const IconSparkle = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z" fill="currentColor" />
    <path d="M18.5 15.5c.3 2 1.2 2.9 3.2 3.2-2 .3-2.9 1.2-3.2 3.2-.3-2-1.2-2.9-3.2-3.2 2-.3 2.9-1.2 3.2-3.2Z" fill="currentColor" opacity=".7" />
  </svg>
);

export const IconPencil = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="m15.2 5.2 3.6 3.6L9 18.6l-4.4.8.8-4.4 9.8-9.8Z" fill="currentColor" />
  </svg>
);

export const IconClose = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const IconPoop = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path
      d="M12 3.5c1.2 1.2.9 2.6 0 3.3 2.5 0 4 1.3 3.7 3.3 2 .3 3.3 1.6 3.1 3.4 1.5.6 2.1 2 1.7 3.4-.5 1.8-2.5 2.6-4.5 2.6H8c-2 0-4-.8-4.5-2.6-.4-1.4.2-2.8 1.7-3.4-.2-1.8 1.1-3.1 3.1-3.4-.3-2 1.3-3.3 3.3-3.3-.4-1.3.2-2.6.4-3.3Z"
      fill="currentColor"
    />
  </svg>
);

export const IconDizzy = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 12c0-1 1.6-1.4 2.2-.4.9 1.4-.5 3.3-2.3 3.2-2.6-.2-3.6-3.2-2.2-5.2 1.9-2.7 6.2-2 7.2 1.1 1.2 3.8-2.3 7.3-6.2 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconExclaim = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 4v10" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    <circle cx="12" cy="19" r="1.9" fill="currentColor" />
  </svg>
);

export const IconCow = ({ size, ...p }: P) => (
  <svg width={size ?? 24} height={size ?? 24} viewBox="0 0 64 64" aria-hidden {...p}>
    <path d="M14 22 Q6 18 8 26 Q10 30 16 28Z" fill="#fffaf2" stroke="#e8dccc" strokeWidth="1" />
    <path d="M50 22 Q58 18 56 26 Q54 30 48 28Z" fill="#fffaf2" stroke="#e8dccc" strokeWidth="1" />
    <path d="M20 14 Q18 8 22 9" stroke="#f3d9a4" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <path d="M44 14 Q46 8 42 9" stroke="#f3d9a4" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    <ellipse cx="32" cy="32" rx="20" ry="19" fill="#fffaf2" />
    <path d="M14 26c2-8 8-12 14-12-2 6-6 11-14 12Z" fill="#3d3346" />
    <ellipse cx="32" cy="42" rx="12.5" ry="8.5" fill="#ffbccb" />
    <ellipse cx="27.5" cy="40.5" rx="1.6" ry="2.2" fill="#d9728e" />
    <ellipse cx="36.5" cy="40.5" rx="1.6" ry="2.2" fill="#d9728e" />
    <path d="M29 45.5q3 2.4 6 0" stroke="#35273c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <ellipse cx="24.5" cy="31" rx="2.6" ry="3.4" fill="#241c2b" />
    <ellipse cx="39.5" cy="31" rx="2.6" ry="3.4" fill="#241c2b" />
    <circle cx="25.4" cy="29.8" r="1" fill="#fff" />
    <circle cx="40.4" cy="29.8" r="1" fill="#fff" />
    <ellipse cx="19" cy="37" rx="3" ry="2" fill="#ff8fb0" opacity=".55" />
    <ellipse cx="45" cy="37" rx="3" ry="2" fill="#ff8fb0" opacity=".55" />
  </svg>
);

const F = ({ size = 44, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    {children}
  </svg>
);

export function FoodIcon({ id, size }: { id: FoodId; size?: number }) {
  switch (id) {
    case "clover":
    case "golden": {
      const c = id === "golden" ? "#ffc933" : "#5dbb63";
      const d = id === "golden" ? "#e59f00" : "#3f9a4a";
      const n = id === "golden" ? 4 : 3;
      return (
        <F size={size}>
          <path d="M24 26c1 7 3 12 7 16" stroke={d} strokeWidth="3" strokeLinecap="round" fill="none" />
          {Array.from({ length: n }).map((_, i) => (
            <g key={i} transform={`rotate(${(360 / n) * i + (n === 3 ? 0 : 45)} 24 24)`}>
              <path d="M24 23c-5-1-9-5-8-10 2-4 7-3 8 1 1-4 6-5 8-1 1 5-3 9-8 10Z" fill={c} stroke={d} strokeWidth="1.2" />
            </g>
          ))}
          {id === "golden" && <path d="M38 8l1.2 2.8 2.8 1.2-2.8 1.2L38 16l-1.2-2.8L34 12l2.8-1.2Z" fill="#fff2a8" />}
        </F>
      );
    }
    case "apple":
      return (
        <F size={size}>
          <path d="M24 16c-3-3-10-3-13 2-3.6 6-.6 17 5 21.5 2.6 2 4.8 1.2 8 0 3.2 1.2 5.4 2 8 0 5.6-4.5 8.6-15.5 5-21.5-3-5-10-5-13-2Z" fill="#ff5a5f" />
          <path d="M24 16c0-3.5 1.2-6 4-8" stroke="#8a5a3b" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M26.5 10.5c3-2.2 7-1.6 8.6.4-2.2 2.6-6 3-8.6-.4Z" fill="#5dbb63" />
          <ellipse cx="16" cy="23" rx="2.4" ry="4" fill="#fff" opacity=".5" transform="rotate(20 16 23)" />
        </F>
      );
    case "carrot":
      return (
        <F size={size}>
          <path d="M29 15c-3-2-7-1-9 2L8.5 38.5c-.8 1.5.8 3 2.2 2.2L31.8 28c3-2 3.8-6 2-9l-4.8-4Z" fill="#ff9434" />
          <path d="M18 22l3 2M14.5 29l2.5 2M21.5 18.5l2 1.5" stroke="#d96d10" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M31 16c.5-4 3-7 6-8M33 18c3-2 7-2.5 9-1M31.5 15.5c-1-3-.5-7 1.5-9" stroke="#4fae55" strokeWidth="3" strokeLinecap="round" fill="none" />
        </F>
      );
    case "watermelon":
      return (
        <F size={size}>
          <path d="M6 16h36c0 11-8 20-18 20S6 27 6 16Z" fill="#3fae52" />
          <path d="M9 16h30c0 9-6.6 16.5-15 16.5S9 25 9 16Z" fill="#d9f5b0" />
          <path d="M11 16h26c0 8-5.8 14.5-13 14.5S11 24 11 16Z" fill="#ff5d73" />
          {[
            [17, 20],
            [24, 24],
            [31, 20],
            [20, 26],
            [28, 26],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="1.1" ry="1.8" fill="#2b2230" />
          ))}
        </F>
      );
    case "chili":
      return (
        <F size={size}>
          <path d="M16 14c-2 12 4 23 20 26 2 .3 2.6-2 1-3-9-5-13-12-13-22l-8-1Z" fill="#ff2d2d" />
          <path d="M14 15c1-3 7-3.5 11-1" stroke="#3f9a4a" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M19.5 13.5c0-3 1-5.5 3-7" stroke="#3f9a4a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M19 20c.4 5 2 9 5 12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".5" fill="none" />
        </F>
      );
    case "cupcake":
      return (
        <F size={size}>
          <path d="M11 26h26l-3.4 14a3 3 0 0 1-2.9 2.3H17.3a3 3 0 0 1-2.9-2.3L11 26Z" fill="#8fd9e8" />
          <path d="M17 27l1.5 15M24 27v15M31 27l-1.5 15" stroke="#6bbccc" strokeWidth="1.6" />
          <path d="M9 26c-1.5-4 1-7.5 5-7.5 0-4 4-7 8-6 1.5-3 6-3.5 8 0 4 0 6.5 3 6 6.5 4 .5 5.5 4 4 7H9Z" fill="#ffb6cf" />
          <circle cx="25" cy="9" r="3.4" fill="#e8203f" />
          <path d="M25 6c.5-2 2-3 3.5-3.4" stroke="#3f9a4a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M15 21l2 1M29 17l2 1M21 17l1 2M33 22l1.5-1" stroke="#ffe066" strokeWidth="1.8" strokeLinecap="round" />
        </F>
      );
    case "pill":
      return (
        <F size={size}>
          <g transform="rotate(-40 24 24)">
            <rect x="8" y="16" width="32" height="16" rx="8" fill="#fff" stroke="#ff6b8b" strokeWidth="2" />
            <path d="M16 16h8v16h-8a8 8 0 0 1 0-16Z" fill="#ff6b8b" />
          </g>
        </F>
      );
  }
}

export function AccessoryIcon({ id, size = 40 }: { id: string; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 48 48", "aria-hidden": true } as const;
  switch (id) {
    case "bell":
      return (
        <svg {...s}>
          <path d="M8 16c5 5 27 5 32 0" stroke="#ff5a6e" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="24" cy="29" r="9" fill="#ffcc40" />
          <path d="M20 31h8" stroke="#7a5500" strokeWidth="2" strokeLinecap="round" />
          <circle cx="21" cy="26" r="2" fill="#fff" opacity=".6" />
        </svg>
      );
    case "flowers":
      return (
        <svg {...s}>
          <path d="M6 28c8 6 28 6 36 0" stroke="#6cc36e" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          {[
            [10, 29, "#ff8fb1"],
            [18, 32, "#ffd166"],
            [26, 32.5, "#ffffff"],
            [34, 31, "#c3a6ff"],
            [40, 27.5, "#ff8fb1"],
          ].map(([x, y, c], i) => (
            <g key={i}>
              <circle cx={x as number} cy={y as number} r="4.6" fill={c as string} stroke="#e7d6e6" strokeWidth="0.8" />
              <circle cx={x as number} cy={y as number} r="1.6" fill="#ffcf4a" />
            </g>
          ))}
        </svg>
      );
    case "party":
      return (
        <svg {...s}>
          <path d="M24 5 36 40H12L24 5Z" fill="#b79cff" />
          <path d="M16.5 27h15M19.5 18h9" stroke="#ffd166" strokeWidth="3" />
          <circle cx="24" cy="6" r="4" fill="#fff" stroke="#e0d6ff" />
        </svg>
      );
    case "shades":
      return (
        <svg {...s}>
          <path d="M6 20h36" stroke="#ff6fa3" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M15 34s-9-5-9-11a4.6 4.6 0 0 1 9-1.4 4.6 4.6 0 0 1 9 1.4c0 6-9 11-9 11Z" fill="#2a2033" stroke="#ff6fa3" strokeWidth="2" />
          <path d="M33 34s-9-5-9-11a4.6 4.6 0 0 1 9-1.4 4.6 4.6 0 0 1 9 1.4c0 6-9 11-9 11Z" fill="#2a2033" stroke="#ff6fa3" strokeWidth="2" />
        </svg>
      );
    case "straw":
      return (
        <svg {...s}>
          <ellipse cx="24" cy="31" rx="20" ry="6" fill="#f2cf7a" />
          <path d="M13 30c0-9 4-15 11-15s11 6 11 15" fill="#f2cf7a" stroke="#dcae4a" strokeWidth="1.2" />
          <path d="M13.5 26h21" stroke="#ff6f91" strokeWidth="4" />
        </svg>
      );
    case "scarf":
      return (
        <svg {...s}>
          <path d="M8 16c6 6 26 6 32 0v6c-6 6-26 6-32 0v-6Z" fill="#7fc8ff" />
          <path d="M28 24l3 17h7l-3-18" fill="#7fc8ff" />
          <path d="M29.5 34h7" stroke="#fff" strokeWidth="2.6" />
          <path d="M16 19.5v5M24 21v5" stroke="#fff" strokeWidth="2.6" />
        </svg>
      );
    case "crown":
      return (
        <svg {...s}>
          <path d="M8 36 6 14l10 9 8-13 8 13 10-9-2 22H8Z" fill="#ffcc40" stroke="#e5a600" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="24" cy="29" r="3.4" fill="#ff4f8a" />
          <circle cx="14" cy="30" r="2" fill="#7fd3ff" />
          <circle cx="34" cy="30" r="2" fill="#7fd3ff" />
        </svg>
      );
    default:
      return null;
  }
}
