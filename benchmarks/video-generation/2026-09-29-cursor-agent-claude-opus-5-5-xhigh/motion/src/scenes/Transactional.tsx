import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CheckIcon, MailIcon, Pill, Reveal as Fade, Rise, RiseWords, WindowCard} from '../components';
import {C, E, blink, mix, mono, pr, sans, sp, tw} from '../lib';

const K = C.accentDark;
const S = C.greenDark;
const P = C.mutedDark;
const T = C.white;

const CODE: [string, string][][] = [
  [['import', K], [' { Lumail } ', T], ['from', K], [' "lumail"', S], [';', T]],
  [],
  [['await', K], [' lumail.emails.send({', T]],
  [['  to', P], [': ', T], ['"user@app.com"', S], [',', T]],
  [['  from', P], [': ', T], ['"hello@yourdomain.com"', S], [',', T]],
  [['  subject', P], [': ', T], ['"Your login code"', S], [',', T]],
  [['  content', P], [': ', T], ['"# Your code\\n\\n{{code}}"', S], [',', T]],
  [['});', T]],
];
const CPS = 120;
const TYPE_T0 = 0.25;
const TOTAL = CODE.reduce((a, l) => a + l.reduce((b, [s]) => b + s.length, 0) + 1, 0);
const TYPE_END = TYPE_T0 + TOTAL / CPS;

const hatch = 'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1.2px, transparent 1.2px 12px)';

const Digits: React.FC<{value: string; t: number; t0: number}> = ({value, t, t0}) => (
  <span style={{display: 'inline-flex'}}>
    {value.split('').map((ch, i) => {
      if (ch === ' ') return <span key={i} style={{width: '0.4em'}} />;
      const k = pr(t, t0 + i * 0.05, 0.45, E.out);
      const target = Number(ch);
      const roll = Math.round(mix(target + 10, target, k)) % 10;
      return (
        <span key={i} style={{display: 'inline-block', width: '0.62em', textAlign: 'center', filter: k < 0.95 ? `blur(${(1 - k) * 3}px)` : undefined}}>
          {roll}
        </span>
      );
    })}
  </span>
);

const Lane: React.FC<{label: string; right: React.ReactNode; progress: number; fast?: boolean; labelColor?: string}> = ({
  label,
  right,
  progress,
  fast,
  labelColor = C.mutedDark,
}) => (
  <div>
    <div style={{display: 'flex', alignItems: 'center', fontFamily: mono, fontSize: 19, letterSpacing: '0.08em', color: labelColor}}>
      <span>{label}</span>
      <div style={{flex: 1}} />
      <span>{right}</span>
    </div>
    <div style={{marginTop: 14, height: 12, borderRadius: 12, background: 'rgba(255,255,255,0.07)', position: 'relative', overflow: 'visible'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress * 100}%`,
          borderRadius: 12,
          background: fast ? `linear-gradient(90deg, ${C.accent}, ${C.flare} 70%, ${C.accentDark})` : 'rgba(247,248,248,0.32)',
          boxShadow: fast && progress > 0 ? '0 0 24px rgba(255,51,0,0.65)' : undefined,
        }}
      />
    </div>
  </div>
);

export const Transactional: React.FC<{t: number}> = ({t}) => {
  const rise = tw(t, -0.5, 0, 0, 1, E.inOut);
  const lift = tw(t, 4.5, 5.0, 0, 1, E.inOut);
  const y = (1 - rise) * 1080 - lift * 1080;
  const rTop = 64 * (1 - rise);
  const rBottom = 64 * lift;

  let chars = Math.max(0, Math.floor((t - TYPE_T0) * CPS));
  const typing = t > TYPE_T0 && t < TYPE_END + 0.1;

  const campaign = tw(t, 0.6, 5.0, 0, 0.44, E.linear);
  const otp = tw(t, 2.5, 2.9, 0, 1, E.inOutSoft);
  const notif = sp(t, 2.95, {damping: 14, stiffness: 170, mass: 0.8});
  const queued = t >= 2.3;

  return (
    <AbsoluteFill
      style={{
        transform: `translateY(${y}px)`,
        borderRadius: `${rTop}px ${rTop}px ${rBottom}px ${rBottom}px`,
        overflow: 'hidden',
        background: C.void,
        boxShadow: '0 -30px 80px rgba(8,9,10,0.35)',
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(900px 620px at 76% 62%, rgba(255,51,0,0.2), transparent 70%)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 72, background: hatch, borderRight: '1px solid rgba(255,255,255,0.08)'}} />
      <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 72, background: hatch, borderLeft: '1px solid rgba(255,255,255,0.08)'}} />

      <div style={{position: 'absolute', left: 140, top: 196, width: 760}}>
        <Fade t={t} t0={-0.1} y={14}>
          <Pill label="Transactional" dark />
        </Fade>
        <div style={{marginTop: 26, fontFamily: sans, fontWeight: 500, fontSize: 96, lineHeight: 1.03, letterSpacing: '-0.045em', color: C.white}}>
          <div>
            <RiseWords text="Replace Resend." t={t} t0={-0.02} stagger={0.08} />
          </div>
          <div>
            <Rise t={t} t0={0.14} style={{color: C.accentDark}}>
              Same
            </Rise>{' '}
            <Rise t={t} t0={0.2} style={{color: C.accentDark}}>
              domain.
            </Rise>
          </div>
        </div>
        <Fade t={t} t0={0.45} style={{marginTop: 30, fontFamily: sans, fontSize: 29, lineHeight: 1.45, color: C.mutedDark, width: 700}}>
          Receipts, login codes, and the newsletter leave through the domain you already warmed up. One dashboard. One bill.
        </Fade>
      </div>

      <Fade t={t} t0={0.6} y={30} style={{position: 'absolute', left: 140, top: 700, width: 760}}>
        <div
          style={{
            borderRadius: 22,
            border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(255,255,255,0.025)',
            padding: '30px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 34,
          }}
        >
          <Lane label="CAMPAIGN · 50,000 RECIPIENTS" right={`sending… ${Math.round(campaign * 100)}%`} progress={campaign} />
          <Lane
            label="OTP · PRIORITY LANE"
            labelColor={C.accentDark}
            right={
              otp >= 1 ? (
                <span style={{color: C.greenDark, opacity: pr(t, 2.9, 0.2)}}>✓ delivered in 0.4s</span>
              ) : otp > 0 ? (
                <span style={{color: C.white}}>sending…</span>
              ) : (
                <span style={{opacity: 0.5}}>idle</span>
              )
            }
            progress={otp}
            fast
          />
        </div>
      </Fade>

      <div
        style={{
          position: 'absolute',
          left: 990,
          top: 190,
          width: 790,
          transform: `perspective(2000px) rotateY(${(1 - sp(t, -0.05, {damping: 20, stiffness: 90})) * 18}deg)`,
          transformOrigin: 'right center',
        }}
      >
        <Fade t={t} t0={-0.05} y={40}>
          <WindowCard title="send.ts" dark bodyStyle={{padding: '30px 36px 26px'}}>
            <div style={{fontFamily: mono, fontSize: 25, lineHeight: '43px', whiteSpace: 'pre', minHeight: 43 * CODE.length}}>
              {CODE.map((l, li) => {
                const len = l.reduce((a, [s]) => a + s.length, 0);
                const visible = Math.max(0, Math.min(len, chars));
                const caretHere = typing && chars >= 0 && chars <= len;
                chars = chars > len ? chars - len - 1 : -1;
                let left = visible;
                return (
                  <div key={li} style={{height: 43}}>
                    {l.map(([s, color], si) => {
                      const part = s.slice(0, Math.max(0, left));
                      left -= part.length;
                      return part ? (
                        <span key={si} style={{color}}>
                          {part}
                        </span>
                      ) : null;
                    })}
                    {caretHere ? (
                      <span style={{display: 'inline-block', width: 12, height: 28, background: C.flare, transform: 'translateY(6px)', marginLeft: 2}} />
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 14,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontFamily: mono,
                fontSize: 22,
                color: C.greenDark,
                opacity: queued ? pr(t, 2.3, 0.25) : 0,
                transform: `translateX(${queued ? (1 - pr(t, 2.3, 0.35)) * -20 : 0}px)`,
              }}
            >
              <CheckIcon size={22} color={C.greenDark} stroke={2.6} />
              queued · priority lane
              {t < 2.5 && queued ? <span style={{opacity: blink(t, 4), color: C.mutedDark}}>▍</span> : null}
            </div>
          </WindowCard>
        </Fade>
      </div>

      {notif > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: 1150,
            top: 770,
            width: 630,
            padding: '24px 28px',
            borderRadius: 30,
            background: 'rgba(247,248,248,0.96)',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.4)',
            display: 'flex',
            gap: 22,
            alignItems: 'flex-start',
            transform: `translateY(${(1 - notif) * 70}px) scale(${0.9 + 0.1 * notif})`,
            opacity: Math.min(1, notif * 2),
            fontFamily: sans,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              flexShrink: 0,
              background: C.ink,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <MailIcon size={32} />
          </div>
          <div style={{flex: 1}}>
            <div style={{display: 'flex', alignItems: 'center', fontSize: 22, color: C.muted}}>
              <span style={{fontWeight: 600, color: C.ink}}>yourdomain.com</span>
              <div style={{flex: 1}} />
              <span>now</span>
            </div>
            <div style={{fontSize: 24, color: C.ink, marginTop: 4}}>Your login code</div>
            <div style={{fontFamily: mono, fontSize: 50, fontWeight: 500, color: C.ink, marginTop: 6, letterSpacing: '0.02em'}}>
              <Digits value="482 913" t={t} t0={3.05} />
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
