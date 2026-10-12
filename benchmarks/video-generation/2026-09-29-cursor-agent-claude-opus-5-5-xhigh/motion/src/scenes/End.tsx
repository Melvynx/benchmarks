import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {ArrowRight, Button, ClickRipple, Cursor, EnvelopeFill, LogoIcon, Reveal as Fade, RiseWords, Sparkle, Wordmark} from '../components';
import {C, E, mix, mono, pr, sans, sp, tw} from '../lib';
import {useTextWidths} from '../measure';

const ICON = 168;
const WORD = 176;
const GAP = ICON * 0.29;
const CY = 372;
const CTA = {x: 960, y: 706};

const PARTICLES = Array.from({length: 22}, (_, i) => {
  const a = random(`a${i}`) * Math.PI * 2;
  const speed = 520 + random(`s${i}`) * 700;
  return {
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed - 380,
    spin: (random(`r${i}`) - 0.5) * 720,
    kind: i % 3,
    size: 26 + random(`z${i}`) * 26,
    color: [C.flare, C.accentDark, C.ink][i % 3 === 2 ? 2 : Math.floor(random(`c${i}`) * 2)],
  };
});

export const End: React.FC<{t: number}> = ({t}) => {
  const widths = useTextWidths([{text: 'Lumail', weight: 600, size: WORD, family: sans, tracking: -0.034}]);
  const wm = widths?.[0] ?? 500;
  const total = ICON + GAP + wm;
  const iconFinalX = 960 - total / 2 + ICON / 2;
  const wordLeft = 960 - total / 2 + ICON + GAP;

  const slam = sp(t, 0, {damping: 11, stiffness: 210, mass: 0.8});
  const scale = mix(3.4, 1, slam);
  const shake = t < 0.35 ? Math.sin(t * 90) * 14 * (1 - t / 0.35) : 0;
  const kLock = sp(t, 0.62, {damping: 20, stiffness: 120, mass: 0.8});
  const iconX = mix(960, iconFinalX, kLock);
  const wordK = pr(t, 0.72, 0.8, E.out);

  const cta = sp(t, 1.3, {damping: 12, stiffness: 190, mass: 0.7});
  const cur = tw(t, 1.55, 2.05, 0, 1, E.outSoft);
  const cx = mix(1480, CTA.x + 60, cur);
  const cy = mix(1120, CTA.y + 6, cur);
  const press = tw(t, 2.08, 2.14, 0, 1, E.linear) * (1 - tw(t, 2.2, 2.32, 0, 1, E.out));
  const burstAge = t - 2.12;
  const drift = tw(t, 0.9, 3.0, 1, 1.025, E.linear);

  return (
    <AbsoluteFill style={{transform: `translateX(${shake}px) scale(${drift})`, transformOrigin: '960px 540px'}}>
      {[0.04, 0.16].map((d, i) => {
        const k = pr(t, d, 0.9, E.out);
        if (t < d || k >= 1) return null;
        const r = 90 + k * (i === 0 ? 1100 : 800);
        return (
          <div
            key={d}
            style={{
              position: 'absolute',
              left: 960 - r,
              top: CY - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `${(i === 0 ? 10 : 5) * (1 - k) + 1}px solid ${i === 0 ? C.flare : C.peach}`,
              opacity: 1 - k,
            }}
          />
        );
      })}

      <div style={{position: 'absolute', left: iconX - ICON / 2, top: CY - ICON / 2, transform: `scale(${scale})`, opacity: pr(t, 0, 0.05, E.linear)}}>
        <LogoIcon w={ICON} />
      </div>
      <div style={{position: 'absolute', left: wordLeft, top: CY - WORD * 0.52, height: WORD * 1.1, width: wm + 40, overflow: 'hidden'}}>
        <Wordmark size={WORD} style={{transform: `translateX(${(1 - wordK) * -(wm + GAP + 20)}px)`, paddingTop: WORD * 0.06}} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 540,
          textAlign: 'center',
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 62,
          letterSpacing: '-0.035em',
          color: C.ink,
        }}
      >
        <RiseWords
          text="Email for people who write, ship and sell."
          t={t}
          t0={0.95}
          stagger={0.045}
          wordStyle={(i) => (i >= 4 ? {color: C.flare} : undefined)}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: CTA.x,
          top: CTA.y,
          transform: `translate(-50%, -50%) scale(${(0.6 + 0.4 * cta) * (1 - press * 0.04)})`,
          opacity: Math.min(1, cta * 2),
        }}
      >
        <Button
          label={
            <>
              Start free <ArrowRight size={32} color="#fff" stroke={2.4} />
            </>
          }
          size={34}
          press={press}
        />
      </div>
      <Fade t={t} t0={1.5} y={12} style={{position: 'absolute', left: 0, right: 0, top: 790, textAlign: 'center', fontFamily: sans, fontSize: 28, color: C.muted}}>
        3,000 emails/month free · no card
      </Fade>
      <Fade
        t={t}
        t0={1.7}
        y={10}
        style={{position: 'absolute', left: 0, right: 0, top: 952, textAlign: 'center', fontFamily: mono, fontSize: 30, letterSpacing: '0.12em', color: C.ink}}
      >
        lumail.io
      </Fade>

      {burstAge > 0
        ? PARTICLES.map((p, i) => {
            const a = burstAge;
            const life = pr(t, 2.12, 0.95, E.linear);
            if (life >= 1) return null;
            const x = CTA.x + p.vx * a * (1 - a * 0.45);
            const y = CTA.y + p.vy * a + 900 * a * a;
            const s = p.size * (1 - life * 0.4) * Math.min(1, a * 12);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x - s / 2,
                  top: y - s / 2,
                  width: s,
                  height: s,
                  transform: `rotate(${p.spin * a}deg)`,
                  opacity: 1 - life,
                  color: p.color,
                }}
              >
                {p.kind === 0 ? (
                  <Sparkle size="100%" />
                ) : p.kind === 1 ? (
                  <EnvelopeFill size="100%" />
                ) : (
                  <div style={{width: '50%', height: '50%', margin: '25%', borderRadius: '50%', background: 'currentColor'}} />
                )}
              </div>
            );
          })
        : null}

      <ClickRipple x={CTA.x} y={CTA.y} t={t} t0={2.12} />
      {t > 1.55 ? <Cursor x={cx} y={cy} press={press} opacity={pr(t, 1.55, 0.15)} /> : null}
    </AbsoluteFill>
  );
};
