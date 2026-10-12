import React, {CSSProperties} from 'react';
import {AbsoluteFill, random} from 'remotion';
import {ClickRipple, Cursor, RiseWords} from '../components';
import {C, E, mix, pr, sans, sp, tw} from '../lib';

const retro = 'Tahoma, Verdana, "Segoe UI", sans-serif';
const bevel = (inset = false): CSSProperties => ({
  borderStyle: 'solid',
  borderWidth: 2,
  borderColor: inset ? '#808080 #ffffff #ffffff #808080' : '#ffffff #808080 #808080 #ffffff',
  background: '#c0c0c0',
});

const WIN = {x: 370, y: 330, w: 1180, h: 620};
export const CLOSE = {x: WIN.x + WIN.w - 26, y: WIN.y + 24};

const RetroButton: React.FC<{children: React.ReactNode; w?: number; style?: CSSProperties}> = ({
  children,
  w = 30,
  style,
}) => (
  <div
    style={{
      ...bevel(),
      width: w,
      height: 26,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: retro,
      fontWeight: 700,
      fontSize: 15,
      color: '#000',
      ...style,
    }}
  >
    {children}
  </div>
);

const TitleBar: React.FC<{title: string; h?: number; size?: number}> = ({title, h = 40, size = 19}) => (
  <div
    style={{
      height: h,
      background: 'linear-gradient(90deg, #0a246a 0%, #3a6ea5 60%, #a6caf0 100%)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 6px 0 10px',
      gap: 10,
      fontFamily: retro,
      fontWeight: 700,
      fontSize: size,
      color: '#fff',
    }}
  >
    <span style={{width: 18, height: 18, background: '#ffcc00', border: '1px solid #806600'}} />
    <span style={{flex: 1, whiteSpace: 'nowrap'}}>{title}</span>
    <div style={{display: 'flex', gap: 3}}>
      <RetroButton>_</RetroButton>
      <RetroButton>□</RetroButton>
      <RetroButton>×</RetroButton>
    </div>
  </div>
);

const ErrorDialog: React.FC<{style?: CSSProperties}> = ({style}) => (
  <div
    style={{
      position: 'absolute',
      width: 500,
      ...bevel(),
      boxShadow: '3px 3px 0 rgba(0,0,0,0.35)',
      ...style,
    }}
  >
    <TitleBar title="Campaign Manager" h={34} size={17} />
    <div style={{display: 'flex', gap: 18, padding: '22px 22px 12px', alignItems: 'center'}}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 44,
          background: '#d4000a',
          color: '#fff',
          fontFamily: retro,
          fontWeight: 700,
          fontSize: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ×
      </div>
      <div style={{fontFamily: retro, fontSize: 18, color: '#000', lineHeight: 1.35}}>
        Error 0x80004005: Template could not be saved. Please try again later.
      </div>
    </div>
    <div style={{display: 'flex', justifyContent: 'center', padding: '4px 0 16px'}}>
      <RetroButton w={110} style={{fontWeight: 400, outline: '1px dotted #000', outlineOffset: -6}}>
        OK
      </RetroButton>
    </div>
  </div>
);

const RetroWindow: React.FC<{t: number}> = ({t}) => {
  const tabs = ['Dashboard', 'Campaigns', 'Lists', 'Reports', 'Autoresponders', 'Account'];
  const blocks = ['Text', 'Image', 'Button', 'Divider', 'Social', 'Spacer', 'HTML'];
  const tools = ['B', 'I', 'U', 'Font ▾', 'Size ▾', 'Undo', 'Preview', 'Save'];
  const saving = Math.min(87, Math.floor(tw(t, 2.3, 3.2, 12, 87, E.linear) / 7) * 7 + 3);
  return (
    <div
      style={{
        width: WIN.w,
        height: WIN.h,
        ...bevel(),
        boxShadow: '8px 8px 0 rgba(26,22,20,0.18)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: retro,
        color: '#000',
        overflow: 'hidden',
      }}
    >
      <TitleBar title="Campaign Manager Pro — Microsoft Internet Explorer" />
      <div style={{height: 30, display: 'flex', alignItems: 'center', gap: 24, padding: '0 12px', fontSize: 17}}>
        {['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div style={{height: 36, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', fontSize: 16}}>
        <span style={{color: '#444'}}>Address</span>
        <div style={{...bevel(true), background: '#fff', flex: 1, height: 26, display: 'flex', alignItems: 'center', padding: '0 8px'}}>
          http://www.campaignmanager-pro.com/editor/template_v2_FINAL.asp?id=00482
        </div>
        <RetroButton w={56} style={{fontWeight: 400}}>
          Go
        </RetroButton>
      </div>
      <div
        style={{
          height: 54,
          background: 'linear-gradient(180deg, #3f6fb5, #2b5797)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          gap: 14,
          color: '#fff',
        }}
      >
        <span style={{fontWeight: 700, fontSize: 25}}>Campaign Manager</span>
        <span style={{border: '1px solid #cfe0ff', fontSize: 12, padding: '2px 6px', letterSpacing: 1}}>PRO EDITION</span>
        <div style={{flex: 1}} />
        <span style={{fontSize: 15, textDecoration: 'underline'}}>Help</span>
        <span style={{fontSize: 15, textDecoration: 'underline'}}>Log out</span>
      </div>
      <div style={{height: 34, display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 10px', background: '#d9d9d9'}}>
        {tabs.map((tab, i) => (
          <div
            key={tab}
            style={{
              padding: '5px 14px',
              fontSize: 15,
              background: i === 1 ? '#fff' : '#ececec',
              border: '1px solid #9a9a9a',
              borderBottom: i === 1 ? '1px solid #fff' : '1px solid #9a9a9a',
              color: '#1b3f8b',
              fontWeight: i === 1 ? 700 : 400,
            }}
          >
            {tab}
          </div>
        ))}
      </div>
      <div style={{flex: 1, display: 'flex', background: '#fff', minHeight: 0}}>
        <div style={{width: 210, borderRight: '1px solid #9a9a9a', background: '#efefef', padding: 10}}>
          <div style={{fontWeight: 700, fontSize: 15, marginBottom: 8}}>Content blocks</div>
          {blocks.map((b) => (
            <div
              key={b}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                border: '1px dashed #9a9a9a',
                padding: '4px 8px',
                marginBottom: 5,
                background: '#fafafa',
              }}
            >
              <span style={{width: 10, height: 10, background: '#9a9a9a'}} />
              {b}
            </div>
          ))}
        </div>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
          <div style={{height: 38, display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px', borderBottom: '1px solid #9a9a9a', background: '#f4f4f4'}}>
            {tools.map((tool) => (
              <div key={tool} style={{...bevel(), background: '#e9e9e9', fontSize: 13, padding: '2px 8px'}}>
                {tool}
              </div>
            ))}
          </div>
          <div style={{flex: 1, background: '#8f8f8f', display: 'flex', justifyContent: 'center', paddingTop: 16}}>
            <div style={{width: 430, background: '#fff', padding: 12, display: 'flex', flexDirection: 'column', gap: 9}}>
              <div style={{height: 46, background: '#5a7fb5', color: '#e8eefc', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 1}}>
                YOUR LOGO HERE
              </div>
              <div style={{height: 70, background: '#d6d6d6', position: 'relative', overflow: 'hidden'}}>
                <svg width="406" height="70" style={{position: 'absolute', inset: 0}}>
                  <line x1="0" y1="0" x2="406" y2="70" stroke="#aaa" strokeWidth="2" />
                  <line x1="406" y1="0" x2="0" y2="70" stroke="#aaa" strokeWidth="2" />
                </svg>
              </div>
              {[92, 80, 96, 60].map((w, i) => (
                <div key={i} style={{height: 9, width: `${w}%`, background: '#c9c9c9'}} />
              ))}
              <div style={{width: 130, height: 34, background: '#e59b2e', color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px outset #f5c46e'}}>
                CLICK HERE
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{height: 30, display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', fontSize: 14, borderTop: '1px solid #9a9a9a'}}>
        <div style={{...bevel(true), flex: 1, height: 22, display: 'flex', alignItems: 'center', padding: '0 8px'}}>
          © 2014 Campaign Manager Inc. · Best viewed in Internet Explorer at 1024×768
        </div>
        <div style={{...bevel(true), width: 300, height: 22, display: 'flex', alignItems: 'center', gap: 2, padding: '0 3px'}}>
          {Array.from({length: 20}).map((_, i) => (
            <span key={i} style={{width: 11, height: 14, background: i < Math.round((saving / 100) * 20) ? '#0a246a' : 'transparent'}} />
          ))}
        </div>
        <span style={{width: 150}}>Saving… {saving}%</span>
      </div>
    </div>
  );
};

export const Problem: React.FC<{t: number}> = ({t}) => {
  // choppy clock for the "old software" parts
  const tq = Math.floor(t * 9) / 9;

  // headline
  const up = tw(t, 1.8, 2.45, 0, 1, E.inOut);
  const headOut = pr(t, 3.95, 0.4, E.in);
  const headY = mix(0, -350, up) - headOut * 50;
  const headScale = mix(1, 0.56, up);

  const chipK = t >= 1.5 ? Math.min(1, Math.floor(sp(t, 1.5, {damping: 9, stiffness: 260}) * 4) / 4 + 0.25) : 0;
  const jitter = t > 1.5 && t < 4 ? (random(`j${Math.floor(t * 10)}`) - 0.5) * 5 : 0;

  // retro window
  const winIn = tw(tq, 2.0, 2.55, 0, 1, E.out);
  const collapseY = tw(t, 3.86, 4.02, 1, 0.006, E.in);
  const collapseX = tw(t, 4.02, 4.18, 1, 0, E.in);
  const glow = tw(t, 3.86, 4.05, 0, 1, E.in);
  const showWin = t >= 2.0 && collapseX > 0.001;

  // modern cursor
  const cur = tw(t, 3.15, 3.74, 0, 1, E.outSoft);
  const cx = mix(1760, CLOSE.x, cur) + Math.sin(cur * Math.PI) * 60;
  const cy = mix(1060, CLOSE.y, cur);
  const press = tw(t, 3.74, 3.8, 0, 1, E.linear) * (1 - tw(t, 3.84, 3.95, 0, 1, E.out));
  const curOpacity = pr(t, 3.15, 0.2) * (1 - pr(t, 4.05, 0.2));

  // flare flood from the close button, landing on the drop
  const r = tw(t, 4.15, 4.98, 0, 1800, E.inSoft);

  // opening spark
  const spark = sp(t, 0.0, {damping: 12, stiffness: 220}) * (1 - pr(t, 0.2, 0.25, E.in));

  return (
    <AbsoluteFill>
      {spark > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: 960 - 14,
            top: 540 - 14,
            width: 28,
            height: 28,
            borderRadius: 28,
            background: C.flare,
            transform: `scale(${spark})`,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 540 - 150,
          textAlign: 'center',
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 132,
          lineHeight: 1.08,
          letterSpacing: '-0.042em',
          color: C.ink,
          transform: `translateY(${headY}px) scale(${headScale})`,
          opacity: 1 - headOut,
          filter: `blur(${headOut * 8}px)`,
        }}
      >
        <div>
          <RiseWords text="Email marketing" t={t} t0={0.22} stagger={0.2} />
        </div>
        <div>
          <RiseWords text="still looks like" t={t} t0={0.78} stagger={0.14} />{' '}
          <span
            style={{
              display: 'inline-block',
              transform: `translate(${jitter}px, ${-jitter * 0.6}px) scale(${chipK})`,
              opacity: chipK > 0 ? 1 : 0,
            }}
          >
            <span
              style={{
                ...bevel(),
                display: 'inline-block',
                fontFamily: retro,
                fontWeight: 700,
                fontSize: '0.8em',
                letterSpacing: 0,
                padding: '0 0.22em',
                lineHeight: 1.15,
                color: '#0a246a',
                boxShadow: '6px 6px 0 rgba(26,22,20,0.2)',
                transform: 'translateY(-0.06em)',
              }}
            >
              2019
            </span>
          </span>
        </div>
      </div>

      {showWin ? (
        <div
          style={{
            position: 'absolute',
            left: WIN.x,
            top: WIN.y,
            transform: `translateY(${(1 - winIn) * 760}px) scale(${collapseX}, ${collapseY})`,
            filter: `brightness(${1 + glow * 2.5}) saturate(${1 - glow})`,
          }}
        >
          <RetroWindow t={t} />
          {[2.75, 2.95, 3.12].map((d, i) =>
            t >= d ? <ErrorDialog key={i} style={{left: 330 + i * 40, top: 190 + i * 36}} /> : null,
          )}
        </div>
      ) : null}

      {t > 3.86 && t < 4.3 ? (
        <div
          style={{
            position: 'absolute',
            left: WIN.x + WIN.w / 2 - 600 * collapseX,
            width: 1200 * collapseX,
            top: WIN.y + WIN.h / 2 - 2,
            height: 4,
            background: '#fff',
            boxShadow: `0 0 40px 12px rgba(255,51,0,${0.6 * (1 - pr(t, 4.1, 0.2))})`,
            opacity: 1 - pr(t, 4.12, 0.15),
          }}
        />
      ) : null}

      <ClickRipple x={CLOSE.x} y={CLOSE.y} t={t} t0={3.78} />
      {curOpacity > 0 ? <Cursor x={cx} y={cy} press={press} opacity={curOpacity} /> : null}

      {r > 0 ? (
        <AbsoluteFill
          style={{
            background: 'linear-gradient(180deg, #ff3516 0%, #f7381f 45%, #ef4842 100%)',
            clipPath: `circle(${r}px at ${CLOSE.x}px ${CLOSE.y}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

