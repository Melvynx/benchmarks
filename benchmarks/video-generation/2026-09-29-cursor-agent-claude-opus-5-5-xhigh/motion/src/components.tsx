import React, {CSSProperties} from 'react';
import {C, E, mono, pr, sans} from './lib';

// ---------- Brand ----------

// The Lumail app icon, rebuilt as vectors from the 256px source (lumail.io/images/lumail-logo-light-256.png)
export const LogoIcon: React.FC<{
  w: number;
  h?: number;
  radius?: number;
  pV?: number;
  pH?: number;
  lScale?: number;
  shadow?: boolean;
  style?: CSSProperties;
}> = ({w, h = w, radius, pV = 1, pH = 1, lScale = 1, shadow = true, style}) => {
  const s = Math.min(w, h) * lScale;
  const r = radius ?? Math.min(w, h) * 0.2275;
  const x0 = 0.285;
  const x1 = 0.402;
  const y0 = 0.191;
  const y1 = 0.805;
  const hx1 = 0.707;
  const hy0 = 0.688;
  const vy = y0 + (y1 - y0) * pV;
  const hx = x1 + (hx1 - x1) * pH;
  const gradH = (y1 - y0) * s;
  const lGrad = 'linear-gradient(180deg, #ffffff 0%, #fff4f2 45%, #f8d4d4 100%)';
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #ff3516 0%, #f7381f 45%, #ef4842 100%)',
        boxShadow: shadow
          ? `inset 0 ${Math.max(1, s * 0.012)}px 0 rgba(255,255,255,0.22), 0 ${s * 0.08}px ${s * 0.18}px -${s * 0.06}px rgba(196,50,10,0.45)`
          : 'none',
        ...style,
      }}
    >
      <div style={{position: 'absolute', left: (w - s) / 2, top: (h - s) / 2, width: s, height: s}}>
        <div
          style={{
            position: 'absolute',
            left: x0 * s,
            top: y0 * s,
            width: (x1 - x0) * s,
            height: Math.max(0, (vy - y0) * s),
            background: lGrad,
            backgroundSize: `100% ${gradH}px`,
            backgroundRepeat: 'no-repeat',
          }}
        />
        {pH > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: x0 * s,
              top: hy0 * s,
              width: (hx - x0) * s,
              height: (y1 - hy0) * s,
              background: lGrad,
              backgroundSize: `100% ${gradH}px`,
              backgroundPosition: `0 ${-(hy0 - y0) * s}px`,
              backgroundRepeat: 'no-repeat',
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export const Wordmark: React.FC<{size: number; color?: string; style?: CSSProperties}> = ({
  size,
  color = C.ink,
  style,
}) => (
  <span
    style={{
      fontFamily: sans,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: '-0.034em',
      lineHeight: 1,
      color,
      display: 'inline-block',
      ...style,
    }}
  >
    Lumail
  </span>
);

export const Lockup: React.FC<{size: number; color?: string; style?: CSSProperties}> = ({
  size,
  color,
  style,
}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.29, ...style}}>
    <LogoIcon w={size} shadow={false} />
    <Wordmark size={size * 0.74} color={color} />
  </div>
);

// ---------- UI atoms (mirroring the lumail.io marketing components) ----------

export const Pill: React.FC<{label: string; dark?: boolean; style?: CSSProperties}> = ({
  label,
  dark = false,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '9px 20px 9px 17px',
      borderRadius: 999,
      background: dark ? 'rgba(255,99,61,0.14)' : C.peach,
      fontFamily: sans,
      fontSize: 24,
      fontWeight: 500,
      color: dark ? C.white : C.ink,
      ...style,
    }}
  >
    <span
      style={{width: 9, height: 9, borderRadius: 9, background: dark ? C.accentDark : C.ink}}
    />
    {label}
  </div>
);

export const Dots: React.FC<{dark?: boolean}> = ({dark}) => (
  <div style={{display: 'flex', gap: 9}}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: 13,
          height: 13,
          borderRadius: 13,
          background: dark ? 'rgba(255,255,255,0.14)' : '#e3dfd9',
        }}
      />
    ))}
  </div>
);

export const WindowCard: React.FC<{
  title: string;
  right?: React.ReactNode;
  dark?: boolean;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  children?: React.ReactNode;
}> = ({title, right, dark, style, bodyStyle, children}) => (
  <div
    style={{
      background: dark ? '#0e0f11' : C.card,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.09)' : C.border}`,
      borderRadius: 22,
      overflow: 'hidden',
      boxShadow: dark
        ? '0 40px 80px -30px rgba(0,0,0,0.8)'
        : '0 1px 2px rgba(26,22,20,0.05), 0 30px 60px -30px rgba(26,22,20,0.25)',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    <div
      style={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '0 24px',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : C.border}`,
      }}
    >
      <Dots dark={dark} />
      <span style={{fontFamily: mono, fontSize: 21, color: dark ? C.mutedDark : C.muted}}>
        {title}
      </span>
      <div style={{flex: 1}} />
      {right}
    </div>
    <div style={{position: 'relative', flex: 1, ...bodyStyle}}>{children}</div>
  </div>
);

export const Panel: React.FC<{style?: CSSProperties; children?: React.ReactNode}> = ({
  style,
  children,
}) => (
  <div style={{background: C.wash, borderRadius: 32, padding: 34, ...style}}>{children}</div>
);

export const Button: React.FC<{
  label: React.ReactNode;
  variant?: 'primary' | 'ghost';
  size?: number;
  press?: number;
  style?: CSSProperties;
}> = ({label, variant = 'primary', size = 26, press = 0, style}) => {
  const primary = variant === 'primary';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: size * 0.4,
        height: size * 2.3,
        padding: `0 ${size * 1.25}px`,
        borderRadius: size * 0.62,
        fontFamily: sans,
        fontWeight: 500,
        fontSize: size,
        color: primary ? '#fff' : C.ink,
        background: primary ? C.flare : '#f3f1ed',
        border: primary ? 'none' : `1px solid ${C.border}`,
        boxShadow: primary
          ? `inset 0 ${-4 * (1 - press) - 1}px 0 ${C.accent}, 0 ${8 * (1 - press)}px ${18 * (1 - press)}px -8px rgba(255,51,0,0.55)`
          : 'none',
        transform: `translateY(${press * 3}px)`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}
    </div>
  );
};

// ---------- Motion atoms ----------

// A word that rises out of a mask
export const Rise: React.FC<{
  t: number;
  t0: number;
  dur?: number;
  children: React.ReactNode;
  style?: CSSProperties;
}> = ({t, t0, dur = 0.75, children, style}) => {
  const k = pr(t, t0, dur, E.out);
  return (
    <span
      style={{
        display: 'inline-block',
        overflow: 'hidden',
        verticalAlign: 'bottom',
        paddingBottom: '0.14em',
        marginBottom: '-0.14em',
        paddingTop: '0.06em',
        marginTop: '-0.06em',
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          transform: `translateY(${(1 - k) * 110}%) rotate(${(1 - k) * 4}deg)`,
          transformOrigin: 'left bottom',
          opacity: k > 0 ? 1 : 0,
        }}
      >
        {children}
      </span>
    </span>
  );
};

export const RiseWords: React.FC<{
  text: string;
  t: number;
  t0: number;
  stagger?: number;
  dur?: number;
  wordStyle?: (i: number, w: string) => CSSProperties | undefined;
}> = ({text, t, t0, stagger = 0.055, dur = 0.75, wordStyle}) => {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <Rise t={t} t0={t0 + i * stagger} dur={dur} style={wordStyle?.(i, w)}>
            {w}
          </Rise>
          {i < words.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </>
  );
};

// Fade + lift for blocks
export const Reveal: React.FC<{
  t: number;
  t0: number;
  dur?: number;
  y?: number;
  x?: number;
  blur?: number;
  style?: CSSProperties;
  children: React.ReactNode;
}> = ({t, t0, dur = 0.7, y = 28, x = 0, blur = 8, style, children}) => {
  const k = pr(t, t0, dur, E.out);
  return (
    <div
      style={{
        opacity: k,
        transform: `translate(${(1 - k) * x}px, ${(1 - k) * y}px)`,
        filter: blur ? `blur(${(1 - k) * blur}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Cursor: React.FC<{x: number; y: number; press?: number; opacity?: number; size?: number}> = ({
  x,
  y,
  press = 0,
  opacity = 1,
  size = 46,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - size * 0.17,
      top: y - size * 0.1,
      width: size,
      height: size,
      opacity,
      transform: `scale(${1 - 0.14 * press})`,
      transformOrigin: '17% 10%',
      filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.28))',
      zIndex: 50,
    }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M4 2.4 L4 19.6 L8.7 15.4 L11.7 21.9 L14.5 20.7 L11.6 14.3 L18 14.3 Z"
        fill={C.ink}
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export const ClickRipple: React.FC<{x: number; y: number; t: number; t0: number; color?: string}> = ({
  x,
  y,
  t,
  t0,
  color = C.flare,
}) => {
  const k = pr(t, t0, 0.55, E.out);
  if (t < t0 || k >= 1) return null;
  const r = 12 + k * 70;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: `${3 * (1 - k) + 1}px solid ${color}`,
        opacity: 1 - k,
        zIndex: 49,
      }}
    />
  );
};

// ---------- Icons ----------

type IconProps = {size?: number | string; color?: string; stroke?: number; style?: CSSProperties};

// Phosphor fill icons used in the lumail.io hero
export const Sparkle: React.FC<IconProps> = ({size = 24, color = 'currentColor', style}) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill={color} style={style}>
    <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94L146,178l-19,51.62a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88L78,110l19-51.62a15.92,15.92,0,0,1,29.88,0L146,110l51.62,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z" />
  </svg>
);

export const EnvelopeFill: React.FC<IconProps> = ({size = 24, color = 'currentColor', style}) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill={color} style={style}>
    <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-8,144H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z" />
  </svg>
);

const Stroke: React.FC<IconProps & {children: React.ReactNode}> = ({
  size = 24,
  color = 'currentColor',
  stroke = 2,
  style,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {children}
  </svg>
);

export const TagIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".6" fill="currentColor" />
  </Stroke>
);
export const MailIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Stroke>
);
export const ClockIcon: React.FC<IconProps & {angle?: number}> = ({angle = 0, ...p}) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 12 L12 6" transform={`rotate(${angle} 12 12)`} />
    <path d="M12 12 L15.5 14" transform={`rotate(${angle * 12} 12 12)`} />
  </Stroke>
);
export const BranchIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <line x1="6" x2="6" y1="3" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </Stroke>
);
export const CheckIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Stroke>
);
export const ArrowRight: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Stroke>
);
export const BoltIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </Stroke>
);
export const UsersIcon: React.FC<IconProps> = (p) => (
  <Stroke {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Stroke>
);
