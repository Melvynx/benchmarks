import React, {useRef} from 'react';
import {AbsoluteFill} from 'remotion';
import {Reveal as Fade, Rise, WindowCard} from '../components';
import {C, E, mix, mono, pr, sans, sp, typed} from '../lib';
import {useChildWidths} from '../measure';

const SIZE = 116;
const TRACK = -0.04;
const NAMES = ['Mailchimp', 'Kit', 'Brevo', 'Systeme.io', 'beehiiv', 'ActiveCampaign', 'MailerLite', 'Resend', 'Mailchimp'];
const SWITCH = [0.12, 0.46, 0.74, 0.98, 1.18, 1.34, 1.47, 1.58, 1.68];
const BOX_PAD = 26;
const DIGIT_STEPS = [0.3, 0.52, 0.72, 0.92, 1.14, 1.42];
const CMD = 'migrate everything from Mailchimp';

const RESULTS = [
  {t0: 1.1, tool: 'import_subscribers', out: '12,847 contacts'},
  {t0: 1.32, tool: 'import_tags', out: '14 tags'},
  {t0: 1.54, tool: 'import_sequences', out: '3 workflows'},
];

const row: React.CSSProperties = {fontFamily: mono, fontSize: 25, lineHeight: '42px', color: C.ink, whiteSpace: 'pre', display: 'flex', alignItems: 'center', gap: 16};

export const Migrate: React.FC<{t: number}> = ({t}) => {
  const measureRef = useRef<HTMLDivElement>(null);
  const widths = useChildWidths(measureRef);
  const nameW = (i: number) => (widths?.[i] ?? 600) + BOX_PAD * 2;

  let idx = 0;
  for (let i = 0; i < SWITCH.length; i++) if (t >= SWITCH[i]) idx = i;
  const gap = idx === 0 ? 0.3 : SWITCH[idx] - SWITCH[idx - 1];
  const k = idx === 0 ? 1 : pr(t, SWITCH[idx], Math.min(0.2, gap * 0.85), E.out);
  const boxW = idx === 0 ? nameW(0) : mix(nameW(idx - 1), nameW(idx), k);
  const boxIn = sp(t, SWITCH[0], {damping: 13, stiffness: 200, mass: 0.7});
  const land = idx === NAMES.length - 1 ? sp(t, SWITCH[idx], {damping: 8, stiffness: 260, mass: 0.6}) : 0;
  const landPop = idx === NAMES.length - 1 ? Math.sin(Math.min(1, pr(t, SWITCH[idx], 0.35, E.out)) * Math.PI) * 0.08 : 0;

  let di = 0;
  for (let i = 0; i < DIGIT_STEPS.length; i++) if (t >= DIGIT_STEPS[i]) di = i;
  const digit = 6 - di;
  const dk = di === 0 ? 1 : pr(t, DIGIT_STEPS[di], 0.14, E.out);
  const underline = pr(t, 1.85, 0.35, E.inOutSoft);

  const out = pr(t, 2.6, 0.4, E.in);

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1 + out * 0.4})`,
        transformOrigin: '960px 520px',
        opacity: 1 - out,
        filter: out > 0 ? `blur(${out * 16}px)` : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 190,
          height: SIZE * 1.25,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: sans,
          fontWeight: 500,
          fontSize: SIZE,
          letterSpacing: `${TRACK}em`,
          color: C.ink,
          whiteSpace: 'pre',
        }}
      >
        <div ref={measureRef} style={{position: 'absolute', left: 0, top: 0, visibility: 'hidden', display: 'flex', whiteSpace: 'nowrap'}}>
          {NAMES.map((n, i) => (
            <span key={i}>“{n}”</span>
          ))}
        </div>
        <span style={{marginRight: '0.26em'}}>
          <Rise t={t} t0={0}>Migrate</Rise> <Rise t={t} t0={0.05}>from</Rise>
        </span>
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            width: boxW,
            height: SIZE * 1.22,
            borderRadius: 22,
            background: C.peach,
            overflow: 'hidden',
            transform: `scale(${(0.5 + 0.5 * boxIn) * (1 + landPop)})`,
            opacity: Math.min(1, boxIn * 2),
          }}
        >
          {[idx - 1, idx].map((i) => {
            if (i < 0) return null;
            const isNew = i === idx;
            const y = isNew ? (1 - k) * 100 : -k * 100;
            if (!isNew && k >= 1) return null;
            return (
              <span
                key={`${i}-${NAMES[i]}`}
                style={{
                  position: 'absolute',
                  left: BOX_PAD,
                  top: 0,
                  lineHeight: `${SIZE * 1.22}px`,
                  transform: `translateY(${y}%)`,
                  color: i === NAMES.length - 1 && land > 0 ? C.accent : C.ink,
                  whiteSpace: 'nowrap',
                }}
              >
                “{NAMES[i]}”
              </span>
            );
          })}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 190 + SIZE * 1.25,
          display: 'flex',
          justifyContent: 'center',
          fontFamily: sans,
          fontWeight: 500,
          fontSize: SIZE,
          letterSpacing: `${TRACK}em`,
          lineHeight: 1.2,
          color: C.ink,
          whiteSpace: 'pre',
        }}
      >
        <Rise t={t} t0={0.22}>in less than </Rise>
        <span style={{position: 'relative', display: 'inline-block'}}>
          <Rise t={t} t0={0.3} style={{color: C.flare}}>
            <span style={{position: 'relative', display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', height: '1.2em', lineHeight: '1.2em'}}>
              <span style={{display: 'inline-block', transform: `translateY(${(dk - 1) * 100}%)`}}>{digit}</span>
              {dk < 1 ? (
                <span style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${dk * 100}%)`}}>{digit + 1}</span>
              ) : null}
            </span>
            0
          </Rise>
          <Rise t={t} t0={0.36}> minutes.</Rise>
          <span
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: -6,
              height: 10,
              borderRadius: 10,
              background: C.flare,
              transform: `scaleX(${underline})`,
              transformOrigin: 'left center',
            }}
          />
        </span>
      </div>

      <div style={{position: 'absolute', left: 460, top: 560, width: 1000}}>
        <Fade t={t} t0={0.3} y={50}>
          <div style={{background: C.accentBg, borderRadius: 30, padding: 22}}>
            <WindowCard
              title="codex"
              bodyStyle={{padding: '24px 34px 28px'}}
              right={
                <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 18, color: C.muted}}>
                  <span style={{width: 9, height: 9, borderRadius: 9, background: C.green}} />
                  lumail · 126 tools
                </div>
              }
            >
              <div style={{...row, gap: 0}}>
                <span style={{color: C.muted}}>{'> '}</span>
                {typed(CMD, t, 0.45, 60)}
                {t < 1.1 ? <span style={{display: 'inline-block', width: 12, height: 27, background: C.flare, marginLeft: 3}} /> : null}
              </div>
              {RESULTS.map((r) =>
                t >= r.t0 ? (
                  <Fade key={r.tool} t={t} t0={r.t0} dur={0.25} y={10} blur={3}>
                    <div style={row}>
                      <span style={{width: 12, height: 12, borderRadius: 12, background: C.green}} />
                      <span style={{fontWeight: 500}}>lumail - {r.tool}</span>
                      <span style={{color: C.muted}}>(MCP)</span>
                      <div style={{flex: 1}} />
                      <span style={{color: C.muted}}>⎿ </span>
                      <span style={{fontWeight: 500}}>{r.out}</span>
                    </div>
                  </Fade>
                ) : null,
              )}
              {t >= 1.85 ? (
                <Fade t={t} t0={1.85} dur={0.3} y={10} blur={3}>
                  <div style={row}>
                    <span style={{width: 12, height: 12, borderRadius: 12, background: C.flare}} />
                    <span style={{fontWeight: 500}}>Done. Ready in 8 minutes.</span>
                  </div>
                </Fade>
              ) : null}
            </WindowCard>
          </div>
        </Fade>
      </div>
    </AbsoluteFill>
  );
};
