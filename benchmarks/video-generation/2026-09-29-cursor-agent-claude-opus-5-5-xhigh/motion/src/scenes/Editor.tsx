import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  ArrowRight,
  Button,
  CheckIcon,
  ClickRipple,
  Cursor,
  Pill,
  Reveal as Fade,
  RiseWords,
  Sparkle,
} from '../components';
import {C, E, blink, fmt, mix, mono, pr, sans, sp, tw, typed} from '../lib';

const CARD = {x: 330, y: 290, w: 1260, h: 730};
const BAR = 72;
const PAD_X = 96;

const TITLE = 'The workflow builder is live';
const LONG =
  'So after many long conversations with the team, and honestly a lot of back and forth, we finally decided to build it, and now it has shipped: you can drag a trigger, an email and a wait, publish it just once, and then the whole sequence basically keeps running on its own, without you.';
const TIGHT = 'It shipped. Drag a trigger, an email and a wait. Publish once, and the sequence keeps running without you.';

const MENU = [
  {label: 'Ask AI', w: 170, ai: true},
  {label: 'Tighten', w: 140},
  {label: 'Shorter', w: 140},
  {label: 'Fix grammar', w: 180},
];
const MENU_POS = {x: CARD.x + PAD_X + 40, y: 548};
const TIGHTEN = {x: MENU_POS.x + 8 + 170 + 17 + 70, y: MENU_POS.y + 30};
const SEND = {x: CARD.x + CARD.w - 20 - 70, y: CARD.y + BAR / 2};

type P = {x: number; y: number};
const path = (t: number, keys: [number, P][], ease = E.inOutSoft): P => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i];
    const [t1, b] = keys[i + 1];
    if (t <= t1) {
      const k = tw(t, t0, t1, 0, 1, ease);
      return {x: mix(a.x, b.x, k), y: mix(a.y, b.y, k)};
    }
  }
  return keys[keys.length - 1][1];
};

const Tool: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div
    style={{
      width: 44,
      height: 44,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: sans,
      fontSize: 22,
      color: C.muted,
      ...style,
    }}
  >
    {children}
  </div>
);

const Sep = () => <div style={{width: 1, height: 28, background: C.border, margin: '0 8px'}} />;

export const Editor: React.FC<{t: number}> = ({t}) => {
  const kc = sp(t, 0.1, {damping: 20, stiffness: 80, mass: 1});
  const push = tw(t, 5.6, 6.0, 0, 1, E.inOut);

  const title = typed(TITLE, t, 0.55, 36);
  const typing = t < 0.55 + TITLE.length / 36 + 0.1;

  const sel = tw(t, 2.16, 2.7, 0, 1, E.inOutSoft);
  const menuIn = sp(t, 2.8, {damping: 16, stiffness: 240, mass: 0.6}) * (1 - pr(t, 3.52, 0.18, E.in));
  const hoverTighten = pr(t, 3.22, 0.12) * (1 - pr(t, 3.5, 0.1));
  const swapOut = pr(t, 3.5, 0.25, E.in);
  const shimmer = tw(t, 3.45, 4.0, -0.3, 1.3, E.inOutSoft);
  const words = Math.round(tw(t, 3.7, 4.1, 96, 71, E.outSoft));
  const badge = sp(t, 4.0, {damping: 12, stiffness: 200, mass: 0.6});

  const cursorPos = path(t, [
    [1.9, {x: 1000, y: 1120}],
    [2.12, {x: CARD.x + PAD_X + 4, y: 648}],
    [2.16, {x: CARD.x + PAD_X + 4, y: 648}],
    [2.7, {x: 1060, y: 846}],
    [2.95, {x: 1060, y: 846}],
    [3.3, TIGHTEN],
    [4.4, TIGHTEN],
    [4.95, SEND],
  ]);
  const press = (a: number) => tw(t, a, a + 0.06, 0, 1, E.linear) * (1 - tw(t, a + 0.1, a + 0.2, 0, 1, E.out));
  const dragPress = tw(t, 2.12, 2.16, 0, 1, E.linear) * (1 - tw(t, 2.7, 2.78, 0, 1, E.out));
  const cursorPress = Math.max(dragPress, press(3.36), press(5.0));
  const sendPress = press(5.0);
  const toast = sp(t, 5.12, {damping: 15, stiffness: 190, mass: 0.7});

  return (
    <AbsoluteFill style={{transform: `translateY(${-push * 1080}px)`}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 132, textAlign: 'center'}}>
        <Fade t={t} t0={0.0} y={14} style={{display: 'flex', justifyContent: 'center'}}>
          <Pill label="Editor" />
        </Fade>
        <div
          style={{
            marginTop: 12,
            fontFamily: sans,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            color: C.ink,
          }}
        >
          <RiseWords
            text="Write the email, not the layout."
            t={t}
            t0={0.08}
            stagger={0.05}
            wordStyle={(i) => (i >= 4 ? {color: C.muted} : undefined)}
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          transform: `perspective(2000px) translateY(${(1 - kc) * 420}px) rotateX(${(1 - kc) * 32}deg)`,
          transformOrigin: 'center top',
          opacity: Math.min(1, kc * 2.5),
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          boxShadow: '0 0 0 12px rgba(255,241,236,0.9), 0 50px 90px -40px rgba(26,22,20,0.35)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: BAR,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 2,
            borderBottom: `1px solid ${C.border}`,
            background: '#fcfbf9',
          }}
        >
          <Tool style={{fontWeight: 700}}>B</Tool>
          <Tool style={{fontStyle: 'italic'}}>I</Tool>
          <Tool style={{textDecoration: 'underline'}}>U</Tool>
          <Tool style={{textDecoration: 'line-through'}}>S</Tool>
          <Sep />
          <Tool style={{fontSize: 19, fontWeight: 600}}>H1</Tool>
          <Tool style={{fontSize: 19, fontWeight: 600}}>H2</Tool>
          <Tool style={{fontSize: 28}}>❝</Tool>
          <Sep />
          <Tool style={{fontFamily: mono, fontSize: 19}}>{'{ }'}</Tool>
          <Tool style={{fontFamily: mono, fontSize: 22}}>/</Tool>
          <div style={{flex: 1}} />
          <Button label="Preview" variant="ghost" size={21} style={{marginRight: 12, height: 50}} />
          <div style={{position: 'relative'}}>
            <Button
              label={
                <>
                  Send <ArrowRight size={22} color="#fff" stroke={2.4} />
                </>
              }
              size={21}
              press={sendPress}
              style={{width: 140, height: 50, padding: 0}}
            />
          </div>
        </div>

        <div style={{position: 'relative', padding: `46px ${PAD_X}px 0`}}>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 58,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: C.ink,
              minHeight: 67,
            }}
          >
            {title}
            {typing && t > 0.2 ? (
              <span
                style={{
                  display: 'inline-block',
                  width: 4,
                  height: 58,
                  marginLeft: 4,
                  background: C.flare,
                  transform: 'translateY(8px)',
                  opacity: t > 0.55 ? 1 : blink(t, 3),
                }}
              />
            ) : null}
          </div>

          <Fade t={t} t0={1.3} y={16} style={{marginTop: 26, fontFamily: sans, fontSize: 32, lineHeight: 1.55, color: C.ink}}>
            Hi{' '}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 12px 0 8px',
                borderRadius: 10,
                background: C.accentBg,
                border: `1px solid ${C.peach}`,
                color: C.accent,
                fontSize: 28,
                lineHeight: 1.4,
                transform: `scale(${0.6 + 0.4 * sp(t, 1.5, {damping: 10, stiffness: 220, mass: 0.6})})`,
              }}
            >
              <span style={{fontFamily: mono, fontSize: 22}}>{'{}'}</span>firstName
            </span>
            , last month you asked for one thing more than anything else: a way to stop sending the welcome email by hand.
          </Fade>

          <div style={{position: 'relative', marginTop: 24, fontFamily: sans, fontSize: 32, lineHeight: 1.55, color: C.ink}}>
            {swapOut < 1 ? (
              <Fade t={t} t0={1.5} y={16}>
                <div style={{opacity: 1 - swapOut, filter: swapOut > 0 ? `blur(${swapOut * 8}px)` : undefined}}>
                  <span
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,51,0,0.16), rgba(255,51,0,0.16))',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${sel * 100}% 100%`,
                    }}
                  >
                    {LONG}
                  </span>
                </div>
              </Fade>
            ) : null}
            {t >= 3.68 ? (
              <div style={{position: 'absolute', left: 0, top: 0, right: 0}}>
                <RiseWords text={TIGHT} t={t} t0={3.7} stagger={0.018} dur={0.5} />
              </div>
            ) : null}
            {shimmer > -0.3 && shimmer < 1.3 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: '-10px -20px',
                  background: `linear-gradient(100deg, transparent ${(shimmer - 0.25) * 100}%, rgba(255,99,61,0.28) ${shimmer * 100}%, transparent ${(shimmer + 0.25) * 100}%)`,
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </div>

          {badge > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: PAD_X,
                top: 392,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                borderRadius: 999,
                background: C.accentBg,
                border: `1px solid ${C.peach}`,
                fontFamily: sans,
                fontSize: 23,
                fontWeight: 500,
                color: C.accent,
                transform: `translateY(${(1 - badge) * 20}px) scale(${0.7 + 0.3 * badge})`,
                opacity: Math.min(1, badge * 2),
              }}
            >
              <Sparkle size={22} color={C.flare} />
              Tightened · your voice kept
            </div>
          ) : null}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 58,
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${PAD_X - 60}px`,
            fontFamily: mono,
            fontSize: 20,
            color: C.muted,
            background: '#fcfbf9',
          }}
        >
          <span>
            <span style={{color: t > 3.7 && t < 4.3 ? C.flare : C.muted}}>{words}</span> words · 1 min read
          </span>
          <div style={{flex: 1}} />
          <span style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <span style={{width: 9, height: 9, borderRadius: 9, background: C.green}} />
            Saved
          </span>
        </div>

        {menuIn > 0.01 ? (
          <div
            style={{
              position: 'absolute',
              left: MENU_POS.x - CARD.x,
              top: MENU_POS.y - CARD.y,
              height: 60,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 14,
              background: C.ink,
              boxShadow: '0 24px 50px -16px rgba(26,22,20,0.55)',
              transform: `translateY(${(1 - menuIn) * 14}px) scale(${0.9 + 0.1 * menuIn})`,
              transformOrigin: 'left bottom',
              opacity: Math.min(1, menuIn * 1.5),
            }}
          >
            {MENU.map((m, i) => (
              <React.Fragment key={m.label}>
                <div
                  style={{
                    width: m.w,
                    height: 44,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    fontFamily: sans,
                    fontSize: 22,
                    fontWeight: 500,
                    color: m.ai ? C.accentDark : C.white,
                    background: i === 1 ? `rgba(255,255,255,${0.14 * hoverTighten})` : 'transparent',
                  }}
                >
                  {m.ai ? <Sparkle size={21} color={C.accentDark} /> : null}
                  {m.label}
                </div>
                {i === 0 ? <div style={{width: 1, height: 26, background: 'rgba(255,255,255,0.18)', margin: '0 8px'}} /> : null}
              </React.Fragment>
            ))}
          </div>
        ) : null}

        {toast > 0.01 ? (
          <div
            style={{
              position: 'absolute',
              right: 20,
              top: BAR + 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 22px',
              borderRadius: 16,
              background: C.card,
              border: `1px solid ${C.border}`,
              boxShadow: '0 20px 40px -18px rgba(26,22,20,0.35)',
              fontFamily: sans,
              fontSize: 23,
              color: C.ink,
              transform: `translateY(${(1 - toast) * -18}px)`,
              opacity: Math.min(1, toast * 2),
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 30,
                background: C.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckIcon size={18} color="#fff" stroke={3} />
            </span>
            <span style={{fontWeight: 600}}>Scheduled</span>
            <span style={{color: C.muted}}>Thu 9:00 · {fmt(12847)} subscribers</span>
          </div>
        ) : null}
      </div>

      <ClickRipple x={TIGHTEN.x} y={TIGHTEN.y} t={t} t0={3.38} />
      <ClickRipple x={SEND.x} y={SEND.y} t={t} t0={5.02} />
      {t > 1.9 ? <Cursor x={cursorPos.x} y={cursorPos.y} press={cursorPress} /> : null}
    </AbsoluteFill>
  );
};
