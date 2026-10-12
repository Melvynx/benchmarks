import React from 'react';
import {AbsoluteFill} from 'remotion';
import {EnvelopeFill, LogoIcon, Reveal as Fade, Rise, Sparkle, Wordmark} from '../components';
import {C, E, mix, pr, sans, sp, tw} from '../lib';
import {useTextWidths} from '../measure';

const ICON = 300;
const LOCK_ICON = 190;
const WORD = 200;
const GAP = LOCK_ICON * 0.29;

const Chip: React.FC<{t: number; t0: number; icon: 'sparkle' | 'mail'; children: React.ReactNode}> = ({
  t,
  t0,
  icon,
  children,
}) => {
  const k = sp(t, t0, {damping: 11, stiffness: 190, mass: 0.8});
  const spin = tw(t, t0, t0 + 0.9, -140, 0, E.out);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.18em',
        margin: '0 0.06em',
        padding: '0 0.22em',
        lineHeight: 1.12,
        borderRadius: '0.26em',
        background: C.card,
        border: `2px solid ${C.border}`,
        boxShadow: '0 2px 4px rgba(26,22,20,0.05), 0 18px 40px -18px rgba(26,22,20,0.3)',
        color: C.flare,
        verticalAlign: 'baseline',
        transform: `translateY(-0.03em) scale(${0.35 + 0.65 * k}) rotate(${(1 - k) * -9}deg)`,
        opacity: Math.min(1, k * 3),
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{display: 'inline-flex', width: '0.72em', height: '0.72em', transform: `rotate(${icon === 'sparkle' ? spin : 0}deg)`}}>
        {icon === 'sparkle' ? <Sparkle size="100%" /> : <EnvelopeFill size="100%" />}
      </span>
      {children}
    </span>
  );
};

export const Reveal: React.FC<{t: number}> = ({t}) => {
  const widths = useTextWidths([{text: 'Lumail', weight: 600, size: WORD, family: sans, tracking: -0.034}]);
  const wm = widths?.[0] ?? 560;
  const total = LOCK_ICON + GAP + wm;
  const iconFinalX = 960 - total / 2 + LOCK_ICON / 2;
  const wordLeft = 960 - total / 2 + LOCK_ICON + GAP;

  // A: the red flood collapses into the app icon
  const pV = pr(t, 0.04, 0.34, E.out);
  const pH = pr(t, 0.3, 0.3, E.out);
  const kShrink = sp(t, 0.6, {damping: 17, stiffness: 95, mass: 0.9});
  // B: icon slides left, wordmark slides out from behind it
  const kLock = sp(t, 1.3, {damping: 20, stiffness: 120, mass: 0.8});
  const size = mix(mix(1080, ICON, kShrink), LOCK_ICON, kLock);
  const w = mix(mix(1920, ICON, kShrink), LOCK_ICON, kLock);
  const radius = Math.min(1, kShrink) * size * 0.2275;
  const iconX = mix(960, iconFinalX, kLock);
  const wordK = pr(t, 1.42, 0.85, E.out);

  // C: lockup rises, hero line builds
  const up = tw(t, 2.45, 3.05, 0, 1, E.inOut);
  const lockY = mix(0, -262, up);
  const lockS = mix(1, 0.5, up);

  // exit
  const out1 = pr(t, 5.45, 0.4, E.in);
  const out2 = pr(t, 5.55, 0.4, E.in);

  const hero = {fontFamily: sans, fontWeight: 500, fontSize: 112, lineHeight: 1.1, letterSpacing: '-0.035em', color: C.ink} as const;
  const lineStyle = (k: number) => ({
    transform: `translateY(${-k * 70}px)`,
    opacity: 1 - k,
    filter: `blur(${k * 10}px)`,
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${lockY - out1 * 60}px) scale(${lockS})`,
          transformOrigin: '960px 540px',
          opacity: 1 - out1,
          filter: `blur(${out1 * 8}px)`,
        }}
      >
        <div style={{position: 'absolute', left: iconX - w / 2, top: 540 - size / 2}}>
          <LogoIcon w={w} h={size} radius={radius} pV={pV} pH={pH} shadow={kShrink > 0.3} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: wordLeft,
            top: 540 - WORD * 0.52,
            height: WORD * 1.1,
            width: wm + 40,
            overflow: 'hidden',
          }}
        >
          <Wordmark
            size={WORD}
            style={{transform: `translateX(${(1 - wordK) * -(wm + GAP + 20)}px)`, paddingTop: WORD * 0.06}}
          />
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: 438, textAlign: 'center', ...hero}}>
        <div style={lineStyle(out1)}>
          <Rise t={t} t0={2.85}>The</Rise> <Chip t={t} t0={2.97} icon="sparkle">AI Tool</Chip>{' '}
          <Rise t={t} t0={3.12}>that</Rise>
        </div>
        <div style={lineStyle(pr(t, 5.5, 0.4, E.in))}>
          {['will', 'make', 'you', 'love'].map((w, i) => (
            <React.Fragment key={w}>
              <Rise t={t} t0={3.26 + i * 0.07}>{w}</Rise>{i < 3 ? ' ' : null}
            </React.Fragment>
          ))}
        </div>
        <div style={lineStyle(out2)}>
          <Chip t={t} t0={3.62} icon="mail">e-mail</Chip>{' '}
          <Rise t={t} t0={3.78} style={{color: C.flare}}>marketing</Rise>
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: 862, ...lineStyle(pr(t, 5.6, 0.35, E.in))}}>
        <Fade t={t} t0={4.2} style={{textAlign: 'center', fontFamily: sans, fontSize: 38, color: C.muted, letterSpacing: '-0.01em'}}>
          You&apos;ll actually like sending emails. And you&apos;ll make more money.
        </Fade>
      </div>
    </AbsoluteFill>
  );
};
