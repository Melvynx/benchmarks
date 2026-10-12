import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  BranchIcon,
  Button,
  CheckIcon,
  ClickRipple,
  ClockIcon,
  Cursor,
  MailIcon,
  Pill,
  Reveal as Fade,
  RiseWords,
  TagIcon,
  WindowCard,
} from '../components';
import {C, E, colorMix, fmt, mix, mono, pr, sans, sp, tw} from '../lib';

const WIN = {x: 140, y: 350, w: 1640, h: 660};
const NW = 240;
const NH = 104;
const Y = 298;
const XS = [48, 376, 704, 1032];
const BX = 1364;
const BW = 228;
const BH = 96;
const YES_Y = 150;
const NO_Y = 446;
const RED = '#e5484d';
const PUBLISH = {x: WIN.x + WIN.w - 24 - 75, y: WIN.y + 32};

type Pt = {x: number; y: number};
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt => {
  const a = (1 - u) ** 3;
  const b = 3 * (1 - u) ** 2 * u;
  const c = 3 * (1 - u) * u ** 2;
  const d = u ** 3;
  return {x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y};
};
const branchPts = (yes: boolean): [Pt, Pt, Pt, Pt] => {
  const y1 = yes ? YES_Y : NO_Y;
  return [
    {x: XS[3] + NW, y: Y},
    {x: XS[3] + NW + 50, y: Y},
    {x: BX - 50, y: y1},
    {x: BX, y: y1},
  ];
};

// segments: 0 node0, 1 conn0, 2 node1, 3 conn1, 4 node2, 5 conn2, 6 node3, 7 branch
const positionOn = (seg: number, u: number, yes: boolean): Pt | null => {
  if (seg % 2 === 0 && seg < 7) return null;
  if (seg === 7) return bez(...branchPts(yes), u);
  const i = (seg - 1) / 2;
  return {x: mix(XS[i] + NW, XS[i + 1], u), y: Y};
};

const locate = (age: number, durs: number[]): {seg: number; u: number} | null => {
  if (age < 0) return null;
  let acc = 0;
  for (let s = 0; s < durs.length; s++) {
    if (age < acc + durs[s]) return {seg: s, u: (age - acc) / durs[s]};
    acc += durs[s];
  }
  return null;
};

const TOKEN_START = 1.55;
const TOKEN_DURS = [0.25, 0.15, 0.3, 0.15, 0.65, 0.15, 0.25, 0.3];
const STREAM_DURS = [0.06, 0.14, 0.06, 0.14, 0.06, 0.14, 0.06, 0.26];
const STREAM = Array.from({length: 17}, (_, i) => ({s: 3.95 + i * 0.12, yes: [0, 1, 3, 4, 6, 7, 8, 10, 11, 13, 14, 16].includes(i)}));

const segStart = (durs: number[], seg: number) => durs.slice(0, seg).reduce((a, b) => a + b, 0);

const CountBadge: React.FC<{n: number; color: string}> = ({n, color}) => (
  <div
    style={{
      position: 'absolute',
      right: -12,
      top: -16,
      padding: '4px 12px',
      borderRadius: 999,
      background: color,
      color: '#fff',
      fontFamily: mono,
      fontSize: 17,
      fontWeight: 500,
    }}
  >
    {fmt(n)} sent
  </div>
);

const Node: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  k: number;
  active: number;
  icon: React.ReactNode;
  title: string;
  sub: React.ReactNode;
  dot?: string;
  children?: React.ReactNode;
}> = ({x, y, w = NW, h = NH, k, active, icon, title, sub, dot, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 16,
      background: C.card,
      border: `1.5px solid ${colorMix(C.border, C.flare, active)}`,
      boxShadow: `0 1px 2px rgba(26,22,20,0.05), 0 16px 30px -22px rgba(26,22,20,0.35), 0 0 0 ${7 * active}px rgba(255,51,0,${0.13 * active})`,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 18px',
      transform: `translateY(${(1 - k) * 34}px) scale(${0.7 + 0.3 * k})`,
      opacity: Math.min(1, k * 2),
    }}
  >
    <div
      style={{
        width: 50,
        height: 50,
        borderRadius: 12,
        flexShrink: 0,
        background: colorMix(C.mutedBg, C.peach, active),
        color: colorMix(C.muted, C.flare, active),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </div>
    <div style={{fontFamily: sans, minWidth: 0}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 9, fontSize: 24, fontWeight: 500, color: C.ink, whiteSpace: 'nowrap'}}>
        {dot ? <span style={{width: 10, height: 10, borderRadius: 10, background: dot}} /> : null}
        {title}
      </div>
      <div style={{fontSize: 19, color: C.muted, marginTop: 3, whiteSpace: 'nowrap'}}>{sub}</div>
    </div>
    {children}
  </div>
);

export const Workflow: React.FC<{t: number}> = ({t}) => {
  const pushIn = tw(t, -0.4, 0, 0, 1, E.inOut);
  const back = pr(t, 5.5, 0.5, E.inOut);

  const nodeK = (i: number) => sp(t, 0.35 + i * 0.13, {damping: 13, stiffness: 190, mass: 0.7});
  const connK = (i: number) => pr(t, 0.48 + i * 0.13, 0.25, E.inOutSoft);
  const branchK = pr(t, 0.88, 0.32, E.inOutSoft);

  const publishPress = tw(t, 1.3, 1.36, 0, 1, E.linear) * (1 - tw(t, 1.4, 1.5, 0, 1, E.out));
  const live = sp(t, 1.42, {damping: 12, stiffness: 220, mass: 0.6});
  const enrolled = tw(t, 3.95, 6.0, 1, 1203, E.linear);
  const yesN = Math.round(tw(t, 4.2, 6.0, 0, 842, E.linear));
  const noN = Math.round(tw(t, 4.3, 6.0, 0, 361, E.linear));

  // token
  const tok = locate(t - TOKEN_START, TOKEN_DURS);
  const tokenActive = (seg: number) => {
    const a = TOKEN_START + segStart(TOKEN_DURS, seg);
    const b = a + TOKEN_DURS[seg];
    return pr(t, a - 0.05, 0.12) * (1 - pr(t, b, 0.3));
  };
  const streamPulse = (seg: number) =>
    Math.max(
      0,
      ...STREAM.map(({s}) => {
        const c = s + segStart(STREAM_DURS, seg) + STREAM_DURS[seg] / 2;
        return Math.max(0, 1 - Math.abs(t - c) / 0.14);
      }),
    ) * 0.5;
  const act = (seg: number) => Math.max(tokenActive(seg), streamPulse(seg));
  const yesActive = Math.max(pr(t, 3.72, 0.1) * (1 - pr(t, 4.1, 0.3)), yesN > 0 ? 0.35 + 0.25 * Math.sin(t * 20) : 0);
  const noActive = noN > 0 ? 0.3 + 0.2 * Math.sin(t * 17 + 1) : 0;

  const waitK = tw(t, 2.4, 3.05, 0, 1, E.inOutSoft);
  const opened = sp(t, 3.3, {damping: 11, stiffness: 220, mass: 0.6});
  const sentFly = pr(t, 2.02, 0.6, E.out);

  const cursor = (() => {
    const k1 = tw(t, 0.75, 1.25, 0, 1, E.outSoft);
    const k2 = tw(t, 1.55, 2.0, 0, 1, E.inOutSoft);
    return {
      x: mix(mix(1480, PUBLISH.x, k1), 1600, k2),
      y: mix(mix(1120, PUBLISH.y, k1), 640, k2),
      o: pr(t, 0.75, 0.15) * (1 - pr(t, 1.95, 0.25)),
    };
  })();

  const connectorStyle = {fill: 'none', stroke: '#d3cdc5', strokeWidth: 2.5, strokeLinecap: 'round' as const};

  return (
    <AbsoluteFill
      style={{
        transform: `translateY(${(1 - pushIn) * 1080}px) scale(${1 - back * 0.07})`,
        transformOrigin: '960px 600px',
        filter: back > 0 ? `brightness(${1 - back * 0.25})` : undefined,
      }}
    >
      <div style={{position: 'absolute', left: 140, top: 136}}>
        <Fade t={t} t0={-0.42} y={14}>
          <Pill label="Workflows" />
        </Fade>
        <div
          style={{
            marginTop: 18,
            fontFamily: sans,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            color: C.ink,
            whiteSpace: 'nowrap',
          }}
        >
          <RiseWords text="Sequences that keep running." t={t} t0={-0.36} stagger={0.06} />
        </div>
      </div>
      <Fade
        t={t}
        t0={-0.2}
        style={{position: 'absolute', left: 1370, top: 168, width: 410, fontFamily: sans, fontSize: 25, lineHeight: 1.45, color: C.muted}}
      >
        Welcome, launch, follow-up. Publish once. Lumail handles enrolment, timing, and exits.
      </Fade>

      <div style={{position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h}}>
        <Fade t={t} t0={-0.4} y={40} blur={0} style={{width: '100%', height: '100%'}}>
          <WindowCard
            title="Welcome sequence"
            style={{height: '100%'}}
            bodyStyle={{
              backgroundImage: 'radial-gradient(circle, #e2ddd6 1.6px, transparent 1.8px)',
              backgroundSize: '30px 30px',
              backgroundPosition: '15px 15px',
            }}
            right={
              live > 0.02 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 44,
                    padding: '0 18px',
                    borderRadius: 999,
                    background: 'rgba(14,159,110,0.1)',
                    fontFamily: sans,
                    fontSize: 21,
                    fontWeight: 500,
                    color: C.green,
                    transform: `scale(${0.6 + 0.4 * live})`,
                    opacity: Math.min(1, live * 2),
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 10,
                      background: C.green,
                      boxShadow: `0 0 0 ${4 + 3 * Math.sin(t * 8)}px rgba(14,159,110,0.18)`,
                    }}
                  />
                  Live
                  {t > 3.95 ? <span style={{color: C.muted, fontWeight: 400}}>· {fmt(enrolled)} enrolled</span> : null}
                </div>
              ) : (
                <Button label="Publish" size={20} press={publishPress} style={{width: 150, height: 44, padding: 0}} />
              )
            }
          >
            <svg width={WIN.w} height={WIN.h - 64} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              {[0, 1, 2].map((i) => (
                <line
                  key={i}
                  x1={XS[i] + NW}
                  y1={Y}
                  x2={mix(XS[i] + NW, XS[i + 1], connK(i))}
                  y2={Y}
                  {...connectorStyle}
                />
              ))}
              {[true, false].map((yes) => {
                const [p0, p1, p2, p3] = branchPts(yes);
                return (
                  <path
                    key={String(yes)}
                    d={`M${p0.x} ${p0.y} C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`}
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={1 - branchK}
                    {...connectorStyle}
                  />
                );
              })}
            </svg>

            <Node x={XS[0]} y={Y - NH / 2} k={nodeK(0)} active={act(0)} icon={<TagIcon size={24} />} title="Tag added" sub="newsletter" />
            <Node x={XS[1]} y={Y - NH / 2} k={nodeK(1)} active={act(2)} icon={<MailIcon size={24} />} title="Send email" sub="Welcome, start here" />
            <Node
              x={XS[2]}
              y={Y - NH / 2}
              k={nodeK(2)}
              active={act(4)}
              icon={<ClockIcon size={26} angle={waitK * 720} />}
              title="Wait"
              sub={waitK > 0 && waitK < 1 ? `day ${1 + Math.min(1, Math.floor(waitK * 2))} of 2` : '2 days'}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 18,
                  right: 18,
                  bottom: 10,
                  height: 4,
                  borderRadius: 4,
                  background: C.flare,
                  transform: `scaleX(${waitK < 1 ? waitK : 1 - pr(t, 3.1, 0.3)})`,
                  transformOrigin: 'left center',
                  opacity: waitK > 0 ? 1 : 0,
                }}
              />
            </Node>
            <Node x={XS[3]} y={Y - NH / 2} k={nodeK(3)} active={act(6)} icon={<BranchIcon size={24} />} title="If opened" sub="the welcome email">
              {opened > 0.01 ? (
                <div
                  style={{
                    position: 'absolute',
                    right: -12,
                    top: -16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px 5px 8px',
                    borderRadius: 999,
                    background: C.green,
                    color: '#fff',
                    fontFamily: sans,
                    fontSize: 17,
                    fontWeight: 600,
                    transform: `scale(${opened})`,
                  }}
                >
                  <CheckIcon size={15} color="#fff" stroke={3.2} />
                  opened
                </div>
              ) : null}
            </Node>
            <Node
              x={BX}
              y={YES_Y - BH / 2}
              w={BW}
              h={BH}
              k={sp(t, 0.98, {damping: 13, stiffness: 190, mass: 0.7})}
              active={yesActive}
              icon={<MailIcon size={22} />}
              title="Yes"
              dot={C.green}
              sub="Launch offer"
            >
              {yesN > 0 ? <CountBadge n={yesN} color={C.green} /> : null}
            </Node>
            <Node
              x={BX}
              y={NO_Y - BH / 2}
              w={BW}
              h={BH}
              k={sp(t, 1.06, {damping: 13, stiffness: 190, mass: 0.7})}
              active={noActive}
              icon={<MailIcon size={22} />}
              title="No"
              dot={RED}
              sub="Reminder"
            >
              {noN > 0 ? <CountBadge n={noN} color={RED} /> : null}
            </Node>

            {sentFly > 0 && sentFly < 1 ? (
              <div
                style={{
                  position: 'absolute',
                  left: XS[1] + 38,
                  top: Y - NH / 2 - 20 - sentFly * 90,
                  color: C.flare,
                  opacity: 1 - sentFly,
                  transform: `rotate(${-12 * sentFly}deg) scale(${1 + sentFly * 0.3})`,
                }}
              >
                <MailIcon size={30} stroke={2.2} />
              </div>
            ) : null}

            {tok
              ? (() => {
                  const p = positionOn(tok.seg, E.inOutSoft(tok.u), true);
                  return p ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: p.x - 11,
                        top: p.y - 11,
                        width: 22,
                        height: 22,
                        borderRadius: 22,
                        background: C.flare,
                        boxShadow: '0 0 0 7px rgba(255,51,0,0.18), 0 0 26px rgba(255,51,0,0.7)',
                      }}
                    />
                  ) : null;
                })()
              : null}

            {STREAM.map(({s, yes}, i) => {
              const loc = locate(t - s, STREAM_DURS);
              if (!loc) return null;
              const p = positionOn(loc.seg, loc.u, yes);
              if (!p) return null;
              const color = loc.seg === 7 ? (yes ? C.green : RED) : C.flare;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.x - 7,
                    top: p.y - 7,
                    width: 14,
                    height: 14,
                    borderRadius: 14,
                    background: color,
                    boxShadow: `0 0 14px ${color}`,
                  }}
                />
              );
            })}
          </WindowCard>
        </Fade>
      </div>

      <ClickRipple x={PUBLISH.x} y={PUBLISH.y} t={t} t0={1.33} />
      {cursor.o > 0 ? <Cursor x={cursor.x} y={cursor.y} press={publishPress} opacity={cursor.o} /> : null}
    </AbsoluteFill>
  );
};
