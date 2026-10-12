import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Button, CheckIcon, ClickRipple, Cursor, Pill, Reveal as Fade, RiseWords, UsersIcon} from '../components';
import {C, E, fmt, mix, mono, pr, sans, sp, tw} from '../lib';

const TICKS: [number, number, string][] = [
  [1e3, 0, '1K'],
  [5e3, 0.1575, '5K'],
  [2e4, 0.315, '20K'],
  [4e4, 0.4207, '40K'],
  [1e5, 0.578, '100K'],
  [4e5, 0.789, '400K'],
  [1e6, 1, '1M'],
];
const valueAt = (p: number) => {
  for (let i = 0; i < TICKS.length - 1; i++) {
    const [va, pa] = TICKS[i];
    const [vb, pb] = TICKS[i + 1];
    if (p <= pb) return Math.exp(mix(Math.log(va), Math.log(vb), (p - pa) / (pb - pa)));
  }
  return 1e6;
};
const posOf = (v: number) => {
  for (let i = 0; i < TICKS.length - 1; i++) {
    const [va, pa] = TICKS[i];
    const [vb, pb] = TICKS[i + 1];
    if (v <= vb) return mix(pa, pb, (Math.log(v) - Math.log(va)) / (Math.log(vb) - Math.log(va)));
  }
  return 1;
};
const roundValue = (v: number) => (v >= 10000 ? Math.round(v / 1000) * 1000 : Math.round(v / 100) * 100);

const TRACK = {x: 214, y: 660, w: 900};
const P0 = posOf(3000);
const P1 = TICKS[3][1];
const CARD = {x: 1270, y: 150, w: 510, h: 850};

const FREE = ['3,000 emails/month included', 'No overage. The send simply stops', '2 team members', '10 AI credits/month', '3 sending domains', 'Unlimited workflows'];
const CREATOR = [
  '40,000 emails/month included',
  'Then $7 / 10,000',
  '10 team members',
  '100 AI conversations/month',
  '10 sending domains',
  'Unlimited workflows',
  'Bring your own ChatGPT or Claude',
];

const PlanFace: React.FC<{
  name: string;
  price: string;
  desc: string;
  cta: string;
  primary?: boolean;
  features: string[];
  tag?: string;
  back?: boolean;
}> = ({name, price, desc, cta, primary, features, tag, back}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backfaceVisibility: 'hidden',
      transform: back ? 'rotateY(180deg)' : undefined,
      background: C.card,
      borderRadius: 26,
      border: primary ? `2.5px solid ${C.flare}` : `1px solid ${C.border}`,
      boxShadow: primary
        ? '0 0 0 8px rgba(255,51,0,0.08), 0 50px 90px -40px rgba(196,50,10,0.45)'
        : '0 1px 2px rgba(26,22,20,0.05), 0 40px 80px -40px rgba(26,22,20,0.3)',
      padding: '40px 40px',
      fontFamily: sans,
      color: C.ink,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 28, fontWeight: 600}}>
      {name}
      {tag ? (
        <span style={{fontSize: 18, fontWeight: 500, padding: '5px 12px', borderRadius: 999, background: C.peach, color: C.accent}}>{tag}</span>
      ) : null}
    </div>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 22}}>
      <span style={{fontSize: 84, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1}}>{price}</span>
      <span style={{fontSize: 24, color: C.muted}}>/month</span>
    </div>
    <div style={{fontSize: 23, color: C.muted, marginTop: 18, lineHeight: 1.4}}>{desc}</div>
    <Button label={cta} variant={primary ? 'primary' : 'ghost'} size={22} style={{width: '100%', marginTop: 28, height: 58, padding: 0}} />
    <div style={{marginTop: 30, display: 'flex', flexDirection: 'column', gap: 16}}>
      {features.map((f) => (
        <div key={f} style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 22, color: '#3a3431'}}>
          <CheckIcon size={20} color={primary ? C.flare : C.muted} stroke={2.6} />
          {f}
        </div>
      ))}
    </div>
  </div>
);

export const Pricing: React.FC<{t: number}> = ({t}) => {
  const drag = tw(t, 1.6, 2.7, 0, 1, E.inOutSoft);
  const p = mix(P0, P1, drag);
  const v = t >= 2.7 ? 40000 : roundValue(valueAt(p));
  const creator = t >= 1.68;
  const flip = tw(t, 1.68, 2.2, 0, 180, E.inOut);
  const flipPop = Math.sin((flip / 180) * Math.PI);
  const swap = pr(t, 1.68, 0.3, E.out);

  const thumbX = TRACK.x + p * TRACK.w;
  const cursor = (() => {
    const k = tw(t, 0.95, 1.45, 0, 1, E.outSoft);
    const k2 = tw(t, 2.95, 3.5, 0, 1, E.inOutSoft);
    const x = t < 1.6 ? mix(760, TRACK.x + P0 * TRACK.w, k) : thumbX;
    const y = t < 1.6 ? mix(1120, TRACK.y, k) : TRACK.y;
    return {x: mix(x, 700, k2), y: mix(y, 925, k2), o: pr(t, 0.95, 0.15) * (1 - pr(t, 4.3, 0.25))};
  })();
  const press = tw(t, 1.48, 1.55, 0, 1, E.linear) * (1 - tw(t, 2.72, 2.82, 0, 1, E.out));

  const subs = tw(t, 2.9, 4.3, 12847, 250000, E.inOutSoft);
  const zero = sp(t, 3.0, {damping: 9, stiffness: 240, mass: 0.6});

  const out = pr(t, 4.62, 0.38, E.in);

  const nearest = TICKS.reduce((best, tk, i) => (Math.abs(tk[1] - p) < Math.abs(TICKS[best][1] - p) ? i : best), 0);

  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${-out * 220}px)`,
        opacity: 1 - out,
        filter: out > 0 ? `blur(${out * 10}px)` : undefined,
      }}
    >
      <div style={{position: 'absolute', left: 140, top: 146}}>
        <Fade t={t} t0={-0.35} y={14}>
          <Pill label="Pricing" />
        </Fade>
        <div style={{marginTop: 22, fontFamily: sans, fontWeight: 500, fontSize: 78, lineHeight: 1.08, letterSpacing: '-0.04em', color: C.ink}}>
          <div>
            <RiseWords text="You pay for emails sent." t={t} t0={-0.3} stagger={0.05} />
          </div>
          <div style={{position: 'relative', display: 'inline-block'}}>
            <RiseWords text="Never for subscribers stored." t={t} t0={-0.12} stagger={0.05} />
            <svg
              width={620}
              height={30}
              viewBox="0 0 620 30"
              style={{position: 'absolute', right: -6, bottom: -16, overflow: 'visible'}}
            >
              <path
                d="M4 20 C 120 6, 260 8, 380 14 S 560 22, 616 10"
                fill="none"
                stroke={C.flare}
                strokeWidth={6}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - pr(t, 0.45, 0.5, E.inOutSoft)}
              />
            </svg>
          </div>
        </div>
      </div>

      <Fade t={t} t0={0.1} y={30} style={{position: 'absolute', left: 140, top: 480, width: 1040}}>
        <div style={{display: 'flex', alignItems: 'flex-start'}}>
          <div style={{fontFamily: sans}}>
            <div style={{fontSize: 28, fontWeight: 600, color: C.ink}}>Emails you send each month</div>
            <div style={{fontSize: 23, color: C.muted, marginTop: 8}}>Type a number or drag the slider.</div>
          </div>
          <div style={{flex: 1}} />
          <div
            style={{
              width: 300,
              height: 84,
              borderRadius: 14,
              background: C.card,
              border: `1.5px solid ${t > 1.55 && t < 2.9 ? C.flare : C.border}`,
              boxShadow: t > 1.55 && t < 2.9 ? '0 0 0 5px rgba(255,51,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '0 26px',
              fontFamily: sans,
              fontSize: 46,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: C.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmt(v)}
          </div>
        </div>
      </Fade>

      <Fade t={t} t0={0.18} y={30} style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080}}>
        {(['−', '+'] as const).map((s, i) => (
          <div
            key={s}
            style={{
              position: 'absolute',
              left: i === 0 ? 140 : TRACK.x + TRACK.w + 22,
              top: TRACK.y - 22,
              width: 44,
              height: 44,
              borderRadius: 44,
              border: `1.5px solid ${C.border}`,
              background: C.card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: sans,
              fontSize: 26,
              color: C.muted,
            }}
          >
            {s}
          </div>
        ))}
        <div style={{position: 'absolute', left: TRACK.x, top: TRACK.y - 4, width: TRACK.w, height: 8, borderRadius: 8, background: '#dedad4'}} />
        <div style={{position: 'absolute', left: TRACK.x, top: TRACK.y - 4, width: p * TRACK.w, height: 8, borderRadius: 8, background: C.flare}} />
        {Array.from({length: 13}).map((_, i) => {
          const tp = i / 12;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: TRACK.x + tp * TRACK.w - 1,
                top: TRACK.y + 18,
                width: 2,
                height: 10,
                background: tp <= p ? C.flare : '#d3cdc5',
                opacity: 0.8,
              }}
            />
          );
        })}
        {TICKS.map(([, tp, label], i) => (
          <div
            key={label}
            style={{
              position: 'absolute',
              left: TRACK.x + tp * TRACK.w - 60,
              width: 120,
              top: TRACK.y + 38,
              textAlign: 'center',
              fontFamily: mono,
              fontSize: 18,
              fontWeight: i === nearest ? 500 : 400,
              color: i === nearest ? C.ink : C.mutedDark,
            }}
          >
            {label}
          </div>
        ))}
        <div
          style={{
            position: 'absolute',
            left: thumbX - 17,
            top: TRACK.y - 17,
            width: 34,
            height: 34,
            borderRadius: 34,
            background: C.flare,
            border: '5px solid #fff',
            boxShadow: `0 4px 12px rgba(196,50,10,0.4), 0 0 0 ${press * 10}px rgba(255,51,0,0.15)`,
            transform: `scale(${1 + press * 0.15})`,
          }}
        />
      </Fade>

      <Fade t={t} t0={0.3} y={20} style={{position: 'absolute', left: 140, top: 770, fontFamily: sans, fontSize: 26, color: C.muted}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
          Best match
          <span style={{position: 'relative', display: 'inline-flex', alignItems: 'baseline', gap: 12, overflow: 'hidden', height: 52, paddingTop: 4}}>
            <span style={{display: 'inline-flex', alignItems: 'baseline', gap: 12, transform: `translateY(${creator ? (1 - swap) * 50 : 0}px)`, opacity: creator ? swap : 1}}>
              <span style={{fontWeight: 600, color: C.ink}}>{creator ? 'Creator' : 'Free'}</span>
              <span style={{fontSize: 42, fontWeight: 500, color: C.ink, letterSpacing: '-0.03em'}}>{creator ? '$20' : '$0'}</span>
            </span>
          </span>
          /month for <span style={{color: C.ink, fontWeight: 500}}>{Math.round(v / 1000)}K</span> emails
        </div>
      </Fade>

      <Fade t={t} t0={0.45} y={30} style={{position: 'absolute', left: 140, top: 866, width: 1040}}>
        <div
          style={{
            height: 124,
            borderRadius: 22,
            background: C.card,
            border: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 34px',
            gap: 22,
            fontFamily: sans,
          }}
        >
          <div style={{width: 58, height: 58, borderRadius: 14, background: C.mutedBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted}}>
            <UsersIcon size={28} />
          </div>
          <div>
            <div style={{fontSize: 21, color: C.muted}}>Subscribers stored</div>
            <div style={{fontSize: 44, fontWeight: 500, color: C.ink, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums'}}>{fmt(subs)}</div>
          </div>
          <div style={{flex: 1}} />
          <div style={{textAlign: 'right'}}>
            <div style={{fontSize: 21, color: C.muted}}>Your bill</div>
            <div style={{fontSize: 44, fontWeight: 500, color: C.ink, letterSpacing: '-0.02em'}}>$20/mo</div>
          </div>
          <div
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(14,159,110,0.12)',
              color: C.green,
              fontFamily: mono,
              fontSize: 26,
              fontWeight: 500,
              transform: `scale(${zero * (1 + 0.06 * Math.max(0, Math.sin((t - 3) * 9)) * (t < 4.3 ? 1 : 0))})`,
              opacity: Math.min(1, zero * 2),
            }}
          >
            +$0
          </div>
        </div>
      </Fade>

      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
        }}
      >
        <Fade t={t} t0={0.25} y={60} style={{width: '100%', height: '100%'}}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              transformStyle: 'preserve-3d',
              transform: `perspective(2400px) rotateY(${flip}deg) scale(${1 + flipPop * 0.06})`,
            }}
          >
            <PlanFace name="Free" price="$0" desc="Everything working end to end, for nothing." cta="Start free" features={FREE} />
            <PlanFace
              back
              primary
              name="Creator"
              tag="For this volume"
              price="$20"
              desc="For a list that pays for itself."
              cta="Start with Creator"
              features={CREATOR}
            />
          </div>
        </Fade>
      </div>

      <ClickRipple x={TRACK.x + P0 * TRACK.w} y={TRACK.y} t={t} t0={1.5} />
      {cursor.o > 0 ? <Cursor x={cursor.x} y={cursor.y} press={press} opacity={cursor.o} /> : null}
    </AbsoluteFill>
  );
};
