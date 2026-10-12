import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, EASE_IN, hand, mono, sans, tween } from "./theme";

const TILE =
  "M512 0C690 0 779 0 850 36C913 68 956 111 988 174C1024 245 1024 334 1024 512C1024 690 1024 779 988 850C956 913 913 956 850 988C779 1024 690 1024 512 1024C334 1024 245 1024 174 988C111 956 68 913 36 850C0 779 0 690 0 512C0 334 0 245 36 174C68 111 111 68 174 36C245 0 334 0 512 0Z";
const LETTER =
  "M37 57C37 59.8284 37.0002 61.2424 37.8789 62.1211C38.7576 62.9998 40.1716 63 43 63H65V74H32C29.1716 74 27.7576 73.9998 26.8789 73.1211C26.0002 72.2424 26 70.8284 26 68V18H37V57Z";

export const Logo: React.FC<{
  size: number;
  id: string;
  draw?: number;
  inverted?: boolean;
  style?: React.CSSProperties;
}> = ({ size, id, draw = 1, inverted = false, style }) => (
  <svg width={size} height={size} viewBox="0 0 1024 1024" style={style}>
    <defs>
      <linearGradient id={`${id}-tile`} x2="0" y2="1">
        <stop stopColor={inverted ? "#ffffff" : "#ff360f"} />
        <stop offset="1" stopColor={inverted ? "#fff1ec" : "#ed4541"} />
      </linearGradient>
      <linearGradient id={`${id}-letter`} x2="0" y2="1">
        <stop stopColor={inverted ? "#ff360f" : "#ffffff"} />
        <stop offset="1" stopColor={inverted ? "#ed4541" : "#f6d5d5"} />
      </linearGradient>
      <linearGradient id={`${id}-rim`} x2="0" y2="1">
        <stop stopColor="#fff" stopOpacity=".38" />
        <stop offset=".3" stopColor="#fff" stopOpacity="0" />
        <stop offset=".8" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#fff" stopOpacity=".28" />
      </linearGradient>
      <clipPath id={`${id}-clip`}>
        <rect x="20" y="14" width="50" height={64 * draw} />
      </clipPath>
    </defs>
    <path d={TILE} fill={`url(#${id}-tile)`} />
    <path d={TILE} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="12" />
    <g transform="translate(0.125 -5.5) scale(11.25)">
      <path d={LETTER} fill={`url(#${id}-letter)`} clipPath={`url(#${id}-clip)`} />
    </g>
  </svg>
);

export const Background: React.FC<{ glow?: boolean }> = ({ glow = true }) => {
  const frame = useCurrentFrame();
  const hatch = `repeating-linear-gradient(135deg, ${C.border} 0 1.5px, transparent 1.5px 14px)`;
  const gx = 960 + Math.sin(frame / 90) * 420;
  const gy = 520 + Math.cos(frame / 110) * 220;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {glow && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(900px 600px at ${gx}px ${gy}px, rgba(255,51,0,0.07), transparent 70%)`,
          }}
        />
      )}
      {[0, 1].map((side) => (
        <div
          key={side}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 150,
            [side ? "right" : "left"]: 0,
            backgroundImage: hatch,
            backgroundPosition: `0 ${frame * 0.6}px`,
            borderLeft: side ? `1.5px solid ${C.border}` : undefined,
            borderRight: side ? undefined : `1.5px solid ${C.border}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const SceneShell: React.FC<{
  duration: number;
  children: React.ReactNode;
  exit?: number;
}> = ({ duration, children, exit = 9 }) => {
  const frame = useCurrentFrame();
  const t = exit > 0 ? tween(frame, duration - exit, exit, 0, 1, EASE_IN) : 0;
  return (
    <AbsoluteFill
      style={{
        opacity: 1 - t,
        transform: `scale(${1 + t * 0.04})`,
        filter: t > 0 ? `blur(${t * 10}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const useSpring = (delay: number, damping = 14, mass = 0.7) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass, stiffness: 140 } });
};

export const Word: React.FC<{
  children: React.ReactNode;
  delay: number;
  style?: React.CSSProperties;
}> = ({ children, delay, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 120 } });
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "top",
        paddingBottom: "0.08em",
        marginBottom: "-0.08em",
      }}
    >
      <span
        style={{
          display: "inline-block",
          transform: `translateY(${(1 - s) * 105}%) rotate(${(1 - s) * 6}deg)`,
          transformOrigin: "left bottom",
          ...style,
        }}
      >
        {children}
      </span>
    </span>
  );
};

export const Words: React.FC<{
  text: string;
  delay: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, delay, stagger = 3, style }) => (
  <>
    {text.split(" ").map((w, i, arr) => (
      <React.Fragment key={i}>
        <Word delay={delay + i * stagger} style={style}>
          {w}
        </Word>
        {i < arr.length - 1 ? " " : null}
      </React.Fragment>
    ))}
  </>
);

export const FadeUp: React.FC<{
  delay: number;
  children: React.ReactNode;
  distance?: number;
  style?: React.CSSProperties;
}> = ({ delay, children, distance = 30, style }) => {
  const frame = useCurrentFrame();
  const t = tween(frame, delay, 18);
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * distance}px)`,
        filter: t < 1 ? `blur(${(1 - t) * 6}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Sparkle: React.FC<{ size: number; color?: string; rotate?: number }> = ({
  size,
  color = C.flare,
  rotate = 0,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotate}deg)` }}>
    <path d="M10 3 L11.8 9.2 L18 11 L11.8 12.8 L10 19 L8.2 12.8 L2 11 L8.2 9.2 Z" fill={color} />
    <path d="M18.5 2 L19.3 4.7 L22 5.5 L19.3 6.3 L18.5 9 L17.7 6.3 L15 5.5 L17.7 4.7 Z" fill={color} />
  </svg>
);

export const MailIcon: React.FC<{ size: number; color?: string }> = ({ size, color = C.flare }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect x="2" y="4.5" width="20" height="15" rx="2.5" fill={color} />
    <path d="M3.5 6.5 L12 13 L20.5 6.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" />
  </svg>
);

export const Check: React.FC<{ size: number; color?: string; bg?: string }> = ({
  size,
  color = "#fff",
  bg = C.flare,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill={bg} />
    <path d="M7 12.5 L10.5 16 L17 8.5" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Chip: React.FC<{
  children: React.ReactNode;
  delay: number;
  fontSize: number;
  icon?: React.ReactNode;
}> = ({ children, delay, fontSize, icon }) => {
  const s = useSpring(delay, 10, 0.8);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: fontSize * 0.14,
        background: C.white,
        color: C.flare,
        border: `1.5px solid ${C.border}`,
        borderRadius: fontSize * 0.2,
        padding: `${fontSize * 0.03}px ${fontSize * 0.18}px ${fontSize * 0.06}px ${fontSize * 0.14}px`,
        boxShadow: "0 18px 40px -18px rgba(26,22,20,0.28), 0 2px 6px rgba(26,22,20,0.06)",
        transform: `scale(${s}) rotate(${(1 - s) * -8}deg)`,
        verticalAlign: "middle",
        lineHeight: 1.1,
        margin: "0 0.08em",
      }}
    >
      {icon}
      {children}
    </span>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode; delay: number }> = ({
  children,
  delay,
}) => {
  const s = useSpring(delay, 16);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: C.peach,
        color: C.flareDeep,
        fontFamily: sans,
        fontWeight: 500,
        fontSize: 26,
        padding: "8px 20px 8px 16px",
        borderRadius: 999,
        transform: `scale(${s})`,
        transformOrigin: "left center",
        opacity: s,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: C.flare }} />
      {children}
    </div>
  );
};

export const Cursor: React.FC<{ x: number; y: number; press?: number }> = ({ x, y, press = 0 }) => (
  <svg
    width={54}
    height={54}
    viewBox="0 0 24 24"
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `scale(${1 - press * 0.15})`,
      filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
    }}
  >
    <path d="M5 2.5 L5 19.5 L9.3 15.4 L12.3 21.8 L15.1 20.6 L12.1 14.3 L18 14.3 Z" fill={C.ink} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export const Scribble: React.FC<{
  progress: number;
  width: number;
  color?: string;
  strokeWidth?: number;
}> = ({ progress, width, color = C.flare, strokeWidth = 7 }) => (
  <svg width={width} height={40} viewBox={`0 0 ${width} 40`} style={{ display: "block", overflow: "visible" }}>
    <path
      d={`M6 26 C ${width * 0.25} 12, ${width * 0.5} 34, ${width * 0.75} 18 S ${width - 20} 20, ${width - 6} 14`}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
    />
  </svg>
);

export const Wipe: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  if (frame < at - 14 || frame > at + 16) return null;
  const inT = tween(frame, at - 14, 14, 0, 1, EASE_IN);
  const outT = tween(frame, at, 16);
  const panel = (color: string, lag: number) => {
    const i = interpolate(frame, [at - 14 + lag, at + lag * 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE_IN,
    });
    const o = interpolate(frame, [at + lag * 0.3, at + 16], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const x = frame < at + lag * 0.3 ? -110 + i * 110 : o * 110;
    return (
      <AbsoluteFill
        style={{
          background: color,
          transform: `translateX(${x}%) skewX(-8deg)`,
          width: "120%",
          left: "-10%",
        }}
      />
    );
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: inT > 0 || outT < 1 ? 1 : 0 }}>
      {panel(C.ink, 0)}
      {panel(C.flare, 3)}
    </AbsoluteFill>
  );
};

export const MonoText: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => <span style={{ fontFamily: mono, ...style }}>{children}</span>;

export const Hand: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => <span style={{ fontFamily: hand, ...style }}>{children}</span>;
