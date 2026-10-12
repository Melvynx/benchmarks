import type { ReactNode } from "react";

type IconProps = { name: string; size?: number; filled?: boolean };

export function Icon({ name, size = 20, filled = false }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {glyph(name, filled)}
    </svg>
  );
}

function glyph(name: string, filled: boolean): ReactNode {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "menu":
      return (
        <g {...stroke}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </g>
      );
    case "search":
      return (
        <g {...stroke}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16.5 20.5 21" />
        </g>
      );
    case "help":
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.7-2.5 2-2.5 3.5" />
          <path d="M12 17h.01" />
        </g>
      );
    case "settings":
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3V20.5M3.5 12h2.2M18.3 12H20.5M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" />
        </g>
      );
    case "refresh":
      return (
        <g {...stroke}>
          <path d="M20 12a8 8 0 1 1-2.2-5.5" />
          <path d="M20 4.5V9h-4.5" />
        </g>
      );
    case "chevron-left":
      return (
        <g {...stroke}>
          <path d="M14.5 5.5 8 12l6.5 6.5" />
        </g>
      );
    case "chevron-right":
      return (
        <g {...stroke}>
          <path d="M9.5 5.5 16 12l-6.5 6.5" />
        </g>
      );
    case "chevron-down":
      return (
        <g {...stroke}>
          <path d="M6 9.5 12 15.5 18 9.5" />
        </g>
      );
    case "more":
      return (
        <g fill="currentColor" stroke="none">
          <circle cx="12" cy="5.5" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="12" cy="18.5" r="1.4" />
        </g>
      );
    case "star":
      return filled ? (
        <polygon points="12,2.8 14.9,8.8 21.4,9.6 16.6,14.1 17.9,20.6 12,17.4 6.1,20.6 7.4,14.1 2.6,9.6 9.1,8.8" fill="currentColor" />
      ) : (
        <polygon {...stroke} points="12,3.2 14.7,8.8 20.8,9.5 16.2,13.8 17.4,19.9 12,16.9 6.6,19.9 7.8,13.8 3.2,9.5 9.3,8.8" />
      );
    case "archive":
      return (
        <g {...stroke}>
          <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z" />
          <path d="M3 4.5h18V8H3z" />
          <path d="M12 11.5v5M9.5 15 12 17.5 14.5 15" />
        </g>
      );
    case "trash":
      return (
        <g {...stroke}>
          <path d="M5 7.5h14" />
          <path d="M9 7.5V5.2h6v2.3" />
          <path d="M7.2 7.5l.7 12h8.2l.7-12" />
        </g>
      );
    case "mail":
      return (
        <g {...stroke}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
          <path d="m4 7 8 6 8-6" />
        </g>
      );
    case "clock":
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5l3 2" />
        </g>
      );
    case "tag":
      return (
        <g {...stroke}>
          <path d="M4 12.5 12.2 4.3H20v7.8l-8.2 8.2L4 12.5z" />
          <circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
        </g>
      );
    case "plus":
      return (
        <g {...stroke}>
          <path d="M12 5v14M5 12h14" />
        </g>
      );
    case "inbox":
      return (
        <g {...stroke}>
          <path d="M4 13h4.2a3.8 3.8 0 0 0 7.6 0H20" />
          <path d="M6 13 4.2 5.5h15.6L18 13v5.5H6V13z" />
        </g>
      );
    case "send":
      return (
        <g {...stroke}>
          <path d="M4 12 20 4.5 14.5 20 11 13.5 4 12z" />
          <path d="M11 13.5 20 4.5" />
        </g>
      );
    case "file":
      return (
        <g {...stroke}>
          <path d="M7 3.5h7l5 5V20.5H7z" />
          <path d="M14 3.5v5h5" />
        </g>
      );
    case "alert":
      return (
        <g {...stroke}>
          <path d="M12 4.2 3.8 19h16.4L12 4.2z" />
          <path d="M12 10v4.2M12 16.8h.01" />
        </g>
      );
    case "pencil":
      return (
        <g {...stroke}>
          <path d="M4 20.5 5.2 15 16.2 4a1.8 1.8 0 0 1 2.6 2.6L7.8 17.6 4 20.5z" />
          <path d="m13.8 6.2 3.2 3.2" />
        </g>
      );
    case "spam":
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m6.2 6.2 11.6 11.6" />
        </g>
      );
    case "layers":
      return (
        <g {...stroke}>
          <path d="m12 4 8 4.2L12 12.4 4 8.2 12 4z" />
          <path d="m4 12 8 4.2 8-4.2" />
          <path d="m4 15.5 8 4.2 8-4.2" />
        </g>
      );
    case "calendar":
      return (
        <g {...stroke}>
          <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
          <path d="M8 3.8v3.2M16 3.8v3.2M4 9.5h16" />
        </g>
      );
    case "paperclip":
      return (
        <g {...stroke}>
          <path d="M8.5 12.5 14.8 6.2a3 3 0 0 1 4.2 4.2l-8.2 8.2a4.2 4.2 0 0 1-6-6l7.4-7.4" />
        </g>
      );
    case "close":
      return (
        <g {...stroke}>
          <path d="M6 6 18 18M18 6 6 18" />
        </g>
      );
    case "minus":
      return (
        <g {...stroke}>
          <path d="M5 12h14" />
        </g>
      );
    case "expand":
      return (
        <g {...stroke}>
          <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" />
        </g>
      );
    case "reply":
      return (
        <g {...stroke}>
          <path d="M9 8 4.5 12.5 9 17" />
          <path d="M5 12.5h8.2A6.3 6.3 0 0 1 19.5 18.8v.2" />
        </g>
      );
    case "reply-all":
      return (
        <g {...stroke}>
          <path d="M11 8 6.5 12.5 11 17" />
          <path d="M7 8 2.5 12.5 7 17" />
          <path d="M7 12.5h7.2A5.3 5.3 0 0 1 19.5 17.8v.2" />
        </g>
      );
    case "forward":
      return (
        <g {...stroke}>
          <path d="M15 8 19.5 12.5 15 17" />
          <path d="M19 12.5H10.8A6.3 6.3 0 0 0 4.5 18.8v.2" />
        </g>
      );
    case "check":
      return (
        <g {...stroke}>
          <path d="M5 12.5 10 17.5 19 7" />
        </g>
      );
    case "image":
      return (
        <g {...stroke}>
          <rect x="4" y="5" width="16" height="14" rx="1.5" />
          <circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none" />
          <path d="m4.5 16 4.5-3.5 3 2.4 3-2.4 4.5 3.5" />
        </g>
      );
    case "link":
      return (
        <g {...stroke}>
          <path d="M10 13.5a4 4 0 0 0 5.7.4l2.2-2.2a4 4 0 0 0-5.6-5.6L11 7.4" />
          <path d="M14 10.5a4 4 0 0 0-5.7-.4L6.1 12.3a4 4 0 0 0 5.6 5.6L13 16.6" />
        </g>
      );
    case "list":
      return (
        <g {...stroke}>
          <path d="M9 7h11M9 12h11M9 17h11" />
          <path d="M4.5 7h.01M4.5 12h.01M4.5 17h.01" />
        </g>
      );
    case "lock":
      return (
        <g {...stroke}>
          <rect x="6" y="10.5" width="12" height="9" rx="1.4" />
          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
        </g>
      );
    case "print":
      return (
        <g {...stroke}>
          <path d="M7 9V4.5h10V9" />
          <path d="M6 17.5H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1" />
          <rect x="7" y="14" width="10" height="6" />
        </g>
      );
    case "people":
      return (
        <g {...stroke}>
          <circle cx="9" cy="9" r="3" />
          <path d="M3.8 19c.6-2.6 2.6-4 5.2-4s4.6 1.4 5.2 4" />
          <circle cx="17" cy="9.5" r="2.2" />
          <path d="M16.2 15c1.8.3 3.2 1.4 3.8 3.5" />
        </g>
      );
    case "back":
      return (
        <g {...stroke}>
          <path d="M15 6 9 12l6 6" />
        </g>
      );
    case "important":
      return (
        <g {...stroke}>
          <path d="M12 4.5 14 9.2l5 .5-3.8 3.3 1.2 4.8L12 15.4 7.6 17.8 8.8 13 5 9.7l5-.5L12 4.5z" />
        </g>
      );
    case "tune":
      return (
        <g {...stroke}>
          <path d="M4 8h16M4 16h16" />
          <circle cx="9" cy="8" r="2.2" fill="var(--bg, #fff)" />
          <circle cx="15" cy="16" r="2.2" fill="var(--bg, #fff)" />
        </g>
      );
    default:
      return null;
  }
}
