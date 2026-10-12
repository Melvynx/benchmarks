import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Panel, Pill, Reveal as Fade, Rise, RiseWords, WindowCard} from '../components';
import {C, E, blink, fmt, mono, pr, sans, sp, tw, typed} from '../lib';

const PROMPT = 'who clicked the pricing link but never bought?';
const NEXT = 'show me the numbers on Thursday';

const CALLS = [
  {t0: 2.1, tool: 'query_subscribers', args: '(clicked: "/pricing")', unit: 'subscribers'},
  {t0: 2.8, tool: 'bulk_add_tags', args: '(tags: ["hot-lead"])', unit: 'tagged'},
  {t0: 3.5, tool: 'add_subscriber_to_workflow', args: '(workflow: "Objections")', unit: 'enrolled'},
];

const AGENTS = ['Claude Code', 'Codex', 'ChatGPT', 'Cursor'];

const line: React.CSSProperties = {fontFamily: mono, fontSize: 25, lineHeight: '40px', color: C.ink, whiteSpace: 'pre'};

const ToolCall: React.FC<{t: number; c: (typeof CALLS)[number]}> = ({t, c}) => {
  if (t < c.t0) return null;
  const done = t >= c.t0 + 0.32;
  const n = tw(t, c.t0 + 0.32, c.t0 + 0.7, 0, 312, E.outSoft);
  const dot = done ? C.green : blink(t, 5) ? C.ink : '#d6d1ca';
  return (
    <Fade t={t} t0={c.t0} dur={0.35} y={14} blur={4} style={{marginTop: 18}}>
      <div style={{...line, display: 'flex', alignItems: 'center', gap: 16}}>
        <span style={{width: 12, height: 12, borderRadius: 12, background: dot, flexShrink: 0}} />
        <span style={{fontWeight: 500}}>lumail - {c.tool}</span>
        <span style={{color: C.muted}}>(MCP)</span>
      </div>
      <div style={{...line, color: C.muted, paddingLeft: 28}}>{c.args}</div>
      {done ? (
        <div style={{...line, color: C.muted, paddingLeft: 28}}>
          {'⎿  '}
          <span style={{color: C.ink, fontWeight: 500}}>{fmt(n)}</span> {c.unit}
        </div>
      ) : null}
    </Fade>
  );
};

export const Agent: React.FC<{t: number}> = ({t}) => {
  const kp = sp(t, 0.12, {damping: 19, stiffness: 85, mass: 1});
  const out = pr(t, 5.6, 0.4, E.in);
  const promptTyped = typed(PROMPT, t, 0.8, 40);
  const nextTyped = typed(NEXT, t, 4.85, 34);
  const doneK = t >= 4.3;

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1 + out * 0.28})`,
        transformOrigin: '1340px 600px',
        filter: out > 0 ? `blur(${out * 14}px)` : undefined,
        opacity: 1 - out,
      }}
    >
      <div style={{position: 'absolute', left: 140, top: 236, width: 720}}>
        <Fade t={t} t0={0.05} y={16}>
          <Pill label="AI" />
        </Fade>
        <div
          style={{
            marginTop: 30,
            fontFamily: sans,
            fontWeight: 500,
            fontSize: 100,
            lineHeight: 1.03,
            letterSpacing: '-0.045em',
            color: C.ink,
          }}
        >
          <div>
            <RiseWords text="Your AI can" t={t} t0={0.12} stagger={0.07} />
          </div>
          <div>
            <RiseWords text="send the" t={t} t0={0.3} stagger={0.07} />
          </div>
          <div>
            <Rise t={t} t0={0.44} style={{color: C.flare}}>
              campaign.
            </Rise>
          </div>
        </div>
        <Fade
          t={t}
          t0={0.7}
          style={{marginTop: 34, fontFamily: sans, fontSize: 31, lineHeight: 1.45, color: C.muted, width: 640}}
        >
          Connect the agent you already use. It drafts, segments, and schedules. You keep the last click.
        </Fade>
        <Fade t={t} t0={1.0} y={10} style={{marginTop: 46, fontFamily: mono, fontSize: 18, letterSpacing: '0.16em', color: C.muted}}>
          WORKS WITH · 126 MCP TOOLS
        </Fade>
        <div style={{display: 'flex', gap: 12, marginTop: 16}}>
          {AGENTS.map((a, i) => {
            const k = sp(t, 1.1 + i * 0.08, {damping: 12, stiffness: 200, mass: 0.6});
            return (
              <div
                key={a}
                style={{
                  padding: '11px 20px',
                  borderRadius: 14,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  fontFamily: sans,
                  fontSize: 25,
                  fontWeight: 500,
                  color: C.ink,
                  transform: `translateY(${(1 - k) * 24}px) scale(${0.8 + 0.2 * k})`,
                  opacity: Math.min(1, k * 2),
                  boxShadow: '0 1px 2px rgba(26,22,20,0.05)',
                }}
              >
                {a}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 900,
          top: 180,
          width: 880,
          height: 830,
          transform: `perspective(2200px) translateX(${(1 - kp) * 280}px) rotateY(${(1 - kp) * -26}deg) rotateX(${(1 - kp) * 7}deg)`,
          transformOrigin: 'left center',
          opacity: Math.min(1, kp * 2),
        }}
      >
        <Panel style={{position: 'absolute', inset: 0, background: C.accentBg}}>
          <WindowCard
            title="claude"
            style={{height: '100%'}}
            bodyStyle={{padding: '30px 36px'}}
            right={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 15px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 999,
                  fontFamily: mono,
                  fontSize: 18,
                  color: C.muted,
                }}
              >
                <span style={{width: 9, height: 9, borderRadius: 9, background: C.green}} />
                lumail · 126 tools
              </div>
            }
          >
            <div style={line}>
              <span style={{color: C.muted}}>{'> '}</span>
              {promptTyped}
              {t < 2.05 && t > 0.3 ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: 13,
                    height: 28,
                    marginLeft: 3,
                    transform: 'translateY(5px)',
                    background: C.flare,
                    opacity: t > 0.8 && t < 2.0 ? 1 : blink(t, 2.5),
                  }}
                />
              ) : null}
            </div>
            {CALLS.map((c) => (
              <ToolCall key={c.tool} t={t} c={c} />
            ))}
            {doneK ? (
              <Fade t={t} t0={4.3} dur={0.4} y={14} blur={4} style={{marginTop: 18}}>
                <div style={{...line, display: 'flex', alignItems: 'center', gap: 16}}>
                  <span style={{width: 12, height: 12, borderRadius: 12, background: C.flare}} />
                  <span style={{fontWeight: 500}}>Done. The first email goes out in 2 hours.</span>
                </div>
              </Fade>
            ) : null}
            {t >= 4.8 ? (
              <div style={{...line, marginTop: 26, color: C.muted}}>
                {'> '}
                <span style={{color: C.ink}}>{nextTyped}</span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 13,
                    height: 28,
                    marginLeft: 3,
                    transform: 'translateY(5px)',
                    background: C.flare,
                  }}
                />
              </div>
            ) : null}
          </WindowCard>
        </Panel>
      </div>
    </AbsoluteFill>
  );
};
