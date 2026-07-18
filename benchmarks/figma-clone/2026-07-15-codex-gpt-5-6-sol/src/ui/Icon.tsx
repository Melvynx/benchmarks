import type { SVGProps } from "react";

export type IconName =
  | "arrow" | "assets" | "check" | "chevron" | "circle" | "comment" | "component" | "copy" | "download" | "eye" | "eyeOff"
  | "frame" | "grid" | "hand" | "help" | "layers" | "line" | "lock" | "menu" | "minus" | "more" | "play" | "plus" | "redo"
  | "rectangle" | "search" | "share" | "sparkle" | "star" | "text" | "trash" | "undo" | "unlock" | "zoomIn" | "zoomOut";

const paths: Readonly<Record<IconName, readonly string[]>> = {
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
  assets: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  check: ["m5 12 4 4L19 6"],
  chevron: ["m8 10 4 4 4-4"],
  circle: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"],
  comment: ["M5 5h14v11H9l-4 4V5Z"],
  component: ["m12 3 9 9-9 9-9-9 9-9Z"],
  copy: ["M8 8h11v11H8z", "M5 16H4V4h12v1"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M4 21h16"],
  eye: ["M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"],
  eyeOff: ["m3 3 18 18", "M10.5 6.2A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a13 13 0 0 1-2.1 2.9", "M6.1 6.1C3.7 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.1 0 2.1-.2 3-.5"],
  frame: ["M4 4h6", "M4 4v6", "M20 4h-6", "M20 4v6", "M4 20h6", "M4 20v-6", "M20 20h-6", "M20 20v-6"],
  grid: ["M4 4h16v16H4z", "M12 4v16", "M4 12h16"],
  hand: ["M7.5 11V7.5a1.5 1.5 0 0 1 3 0V11", "M10.5 10V5.5a1.5 1.5 0 0 1 3 0V10", "M13.5 10V7a1.5 1.5 0 0 1 3 0v4", "M16.5 10a1.5 1.5 0 0 1 3 0v3c0 5-2.5 8-7 8-3 0-4.5-1-6.5-4l-2-3a1.6 1.6 0 0 1 2.5-2l1 1"],
  help: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M9.5 9a2.7 2.7 0 1 1 4.3 2.2c-1.5 1-1.8 1.5-1.8 2.8", "M12 18h.01"],
  layers: ["m12 3 9 5-9 5-9-5 9-5Z", "m3 12 9 5 9-5", "m3 16 9 5 9-5"],
  line: ["M4 20 20 4"],
  lock: ["M6 10h12v10H6z", "M8 10V7a4 4 0 0 1 8 0v3"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  minus: ["M5 12h14"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  play: ["m8 5 11 7-11 7V5Z"],
  plus: ["M12 5v14", "M5 12h14"],
  redo: ["M20 7v5h-5", "M20 12a8 8 0 1 0-2 5.3"],
  rectangle: ["M4 5h16v14H4z"],
  search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "m16 16 5 5"],
  share: ["M12 3v13", "m7 8 5-5 5 5", "M5 14v7h14v-7"],
  sparkle: ["m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z", "m19 16 .6 1.4L21 18l-1.4.6L19 20l-.6-1.4L17 18l1.4-.6L19 16Z"],
  star: ["m12 3 2.7 5.6 6.2.9-4.5 4.4 1.1 6.1-5.5-2.9L6.5 20l1.1-6.1-4.5-4.4 6.2-.9L12 3Z"],
  text: ["M5 5h14", "M12 5v14", "M8 19h8"],
  trash: ["M5 7h14", "M9 7V4h6v3", "M7 7l1 14h8l1-14"],
  undo: ["M4 7v5h5", "M4 12a8 8 0 1 1 2 5.3"],
  unlock: ["M6 10h12v10H6z", "M8 10V7a4 4 0 0 1 7.6-1.7"],
  zoomIn: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "m16 16 5 5", "M11 8v6", "M8 11h6"],
  zoomOut: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "m16 16 5 5", "M8 11h6"],
};

export function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { readonly name: IconName; readonly size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.65" {...props}>
      {paths[name].map((path) => <path d={path} key={path} />)}
    </svg>
  );
}
