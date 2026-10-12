import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Check, Chip, Eyebrow, FadeUp, Logo, Scribble, Words, useSpring } from "./components";
import { C, fmt, mono, sans, tween } from "./theme";

const base: React.CSSProperties = { fontFamily: sans, color: C.ink };

const Spinner: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `3px solid rgba(255,255,255,0.15)`,
        borderTopColor: C.flare,
        transform: `rotate(${frame * 18}deg)`,
      }}
    />
  );
};

const tools = [
  { name: "query_subscribers", arg: '(clicked: "/pricing")', n: 312, unit: "subscribers" },
  { name: "bulk_add_tags", arg: '(tags: ["hot-lead"])', n: 312, unit: "tagged" },
  { name: "add_subscriber_to_workflow", arg: '(workflow: "Objections")', n: 312, unit: "enrolled" },
];

const agents = ["Claude", "ChatGPT", "Cursor", "Codex", "Hermes", "OpenClaw"];

export const Agent: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = tween(frame, 0, 26);
  const prompt = "who clicked the pricing link but never bought?";
  const typed = prompt.slice(0, Math.floor(tween(frame, 12, 34, 0, prompt.length, (t) => t)));
  const drift = interpolate(frame, [0, 210], [0, 1]);

  return (
    <AbsoluteFill style={base}>
      <div
        style={{
          position: "absolute",
          left: 200,
          top: 190,
          width: 1000,
          perspective: 1800,
        }}
      >
        <div
          style={{
            background: "#0d0e10",
            borderRadius: 26,
            border: "1.5px solid rgba(255,255,255,0.08)",
            boxShadow: "0 60px 120px -40px rgba(26,22,20,0.55), 0 0 0 10px rgba(255,255,255,0.6)",
            overflow: "hidden",
            opacity: enter,
            transform: `translateX(${(1 - enter) * -120}px) rotateY(${(1 - enter) * 24 + drift * -4}deg) rotateX(${drift * 2}deg)`,
            transformOrigin: "left center",
            fontFamily: mono,
            color: "#e8e6e3",
            height: 700,
          }}
        >
          <div
            style={{
              height: 70,
              display: "flex",
              alignItems: "center",
              padding: "0 26px",
              gap: 12,
              borderBottom: "1.5px solid rgba(255,255,255,0.07)",
            }}
          >
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <span key={c} style={{ width: 16, height: 16, borderRadius: 99, background: c }} />
            ))}
            <span style={{ marginLeft: 18, fontSize: 24, color: "#8a8f98" }}>claude</span>
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 22,
                color: C.flareSoft,
                background: "rgba(255,51,0,0.12)",
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              <Logo size={24} id="term" /> lumail · 126 tools
            </span>
          </div>
          <div style={{ padding: "34px 40px", fontSize: 28, lineHeight: 1.5 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ color: C.flare }}>›</span>
              <span>
                {typed}
                {frame < 52 && Math.floor(frame / 7) % 2 === 0 ? (
                  <span style={{ background: "#e8e6e3", color: "#e8e6e3" }}>_</span>
                ) : null}
              </span>
            </div>
            {tools.map((t, i) => {
              const at = 54 + i * 30;
              const s = tween(frame, at, 14);
              const done = frame > at + 20;
              const count = tween(frame, at + 8, 16, 0, t.n);
              return (
                <div
                  key={t.name}
                  style={{
                    marginTop: 30,
                    opacity: s,
                    transform: `translateY(${(1 - s) * 20}px)`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 20,
                  }}
                >
                  <div style={{ paddingTop: 6 }}>{done ? <Check size={30} /> : <Spinner size={30} />}</div>
                  <div style={{ flex: 1 }}>
                    <div>
                      <span style={{ color: "#8a8f98" }}>lumail - </span>
                      <span style={{ color: "#fff" }}>{t.name}</span>
                      <span style={{ color: "#5d6168" }}> (MCP)</span>
                    </div>
                    <div style={{ color: "#6f747c", fontSize: 24 }}>{t.arg}</div>
                  </div>
                  <div
                    style={{
                      color: done ? C.flareSoft : "#8a8f98",
                      fontSize: 26,
                      paddingTop: 2,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmt(count)} {t.unit}
                  </div>
                </div>
              );
            })}
            <FadeUp delay={150} distance={16} style={{ marginTop: 38, display: "flex", gap: 16 }}>
              <span style={{ color: C.flare }}>●</span>
              <span style={{ color: "#fff" }}>
                Done. The first email goes out in <span style={{ color: C.flareSoft }}>2 hours</span>.
              </span>
            </FadeUp>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: 1270, top: 230, width: 500 }}>
        <Eyebrow delay={8}>AI agents</Eyebrow>
        <div
          style={{
            fontSize: 84,
            fontWeight: 600,
            letterSpacing: "-0.045em",
            lineHeight: 1.02,
            marginTop: 26,
          }}
        >
          <Words text="Your AI can send the" delay={14} stagger={3} />{" "}
          <Words text="campaign." delay={29} style={{ color: C.flare }} />
        </div>
        <FadeUp delay={42} style={{ fontSize: 30, color: C.muted, marginTop: 26, lineHeight: 1.4 }}>
          It drafts, segments, and schedules. You keep the last click.
        </FadeUp>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 34 }}>
          {agents.map((a, i) => {
            const s = useSpring(70 + i * 6, 11);
            return (
              <span
                key={a}
                style={{
                  transform: `scale(${s})`,
                  background: C.white,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "10px 18px",
                  fontSize: 26,
                  fontWeight: 500,
                }}
              >
                {a}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const competitors = ["Mailchimp", "Kit", "Brevo", "beehiiv", "ActiveCampaign", "MailerLite", "Systeme.io", "Resend", "Mailchimp"];

const imports = [
  { tool: "import_subscribers", n: 12847, unit: "contacts" },
  { tool: "import_tags", n: 14, unit: "tags" },
  { tool: "import_sequences", n: 3, unit: "workflows" },
];

export const Migrate: React.FC = () => {
  const frame = useCurrentFrame();
  const idx = Math.min(competitors.length - 1, Math.max(0, Math.floor((frame - 10) / 7)));
  const local = frame - 10 - idx * 7;
  const flip = tween(local, 0, 5);
  const settled = idx === competitors.length - 1;
  const done = useSpring(128, 12);

  return (
    <AbsoluteFill style={{ ...base, alignItems: "center" }}>
      <div
        style={{
          marginTop: 150,
          fontSize: 108,
          fontWeight: 600,
          letterSpacing: "-0.045em",
          lineHeight: 1.15,
          textAlign: "center",
        }}
      >
        <div>
          <Words text="Migrate from" delay={0} stagger={4} />{" "}
          <Chip delay={6} fontSize={108}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - flip) * 40}%)`,
                opacity: flip,
                filter: `blur(${(1 - flip) * 6}px)`,
              }}
            >
              “{competitors[idx]}”
            </span>
          </Chip>
        </div>
        <div style={{ display: "inline-block", position: "relative" }}>
          <Words text="in less than" delay={16} stagger={4} />{" "}
          <Words text="10 minutes." delay={26} stagger={4} style={{ color: C.flare }} />
          <div style={{ position: "absolute", right: -10, bottom: -26, width: 560 }}>
            <Scribble progress={tween(frame, 70, 20)} width={560} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 28, marginTop: 80 }}>
        {imports.map((m, i) => {
          const s = useSpring(50 + i * 8, 13);
          const p = tween(frame, 58 + i * 10, 50);
          return (
            <div
              key={m.tool}
              style={{
                width: 420,
                background: C.white,
                border: `1.5px solid ${C.border}`,
                borderRadius: 22,
                padding: "26px 30px",
                transform: `translateY(${(1 - s) * 80}px) scale(${0.9 + s * 0.1})`,
                opacity: Math.min(1, s * 1.4),
                boxShadow: "0 30px 60px -36px rgba(26,22,20,0.4)",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 21, color: C.muted }}>
                lumail - <span style={{ color: C.ink }}>{m.tool}</span> (MCP)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 14 }}>
                <span
                  style={{
                    fontSize: 72,
                    fontWeight: 600,
                    letterSpacing: "-0.04em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(m.n * p)}
                </span>
                <span style={{ fontSize: 30, color: C.muted }}>{m.unit}</span>
                {p >= 1 && (
                  <span style={{ marginLeft: "auto" }}>
                    <Check size={36} />
                  </span>
                )}
              </div>
              <div style={{ height: 8, borderRadius: 8, background: C.wash, marginTop: 16, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${p * 100}%`, background: C.flare, borderRadius: 8 }} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 56,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: C.ink,
          color: C.white,
          fontSize: 34,
          fontWeight: 500,
          padding: "18px 34px 18px 22px",
          borderRadius: 999,
          transform: `scale(${done})`,
          opacity: settled ? 1 : 0,
        }}
      >
        <Check size={40} />
        Done. Ready in 8 minutes.
      </div>
    </AbsoluteFill>
  );
};

type NodeDef = { x: number; y: number; icon: string; title: string; sub: string; w?: number };

const nodes: NodeDef[] = [
  { x: 380, y: 70, icon: "#", title: "Tag added", sub: "newsletter" },
  { x: 380, y: 230, icon: "✉", title: "Send email", sub: "Welcome, start here" },
  { x: 380, y: 390, icon: "◷", title: "Wait", sub: "2 days" },
  { x: 380, y: 550, icon: "⑂", title: "If opened", sub: "the welcome email" },
  { x: 200, y: 730, icon: "✉", title: "Yes", sub: "Send the launch", w: 320 },
  { x: 560, y: 730, icon: "↻", title: "No", sub: "New subject line", w: 320 },
];

export const Workflow: React.FC = () => {
  const frame = useCurrentFrame();
  const at = (i: number) => 14 + i * 13;
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [3, 5],
  ];
  const travel = tween(frame, 80, 55, 0, 1, (t) => t);
  const dotY = 125 + travel * 480;
  const panelIn = tween(frame, 0, 24);

  return (
    <AbsoluteFill style={base}>
      <div style={{ position: "absolute", left: 220, top: 300, width: 660 }}>
        <Eyebrow delay={4}>Workflows</Eyebrow>
        <div style={{ fontSize: 100, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.0, marginTop: 28 }}>
          <Words text="Sequences that" delay={8} stagger={4} />{" "}
          <Words text="keep running." delay={18} stagger={4} style={{ color: C.flare }} />
        </div>
        <FadeUp delay={36} style={{ fontSize: 32, color: C.muted, marginTop: 30, lineHeight: 1.4 }}>
          Welcome, launch, follow-up. Publish once. Lumail handles enrolment, timing, and exits.
        </FadeUp>
      </div>

      <div
        style={{
          position: "absolute",
          left: 960,
          top: 80,
          width: 760,
          height: 920,
          background: C.peach,
          borderRadius: 32,
          transform: `translateX(${(1 - panelIn) * 200}px)`,
          opacity: panelIn,
          overflow: "hidden",
          backgroundImage: `radial-gradient(rgba(196,50,10,0.13) 1.6px, transparent 1.6px)`,
          backgroundSize: "28px 28px",
        }}
      >
        <svg width={760} height={920} style={{ position: "absolute", inset: 0 }}>
          {edges.map(([a, b], i) => {
            const A = nodes[a];
            const B = nodes[b];
            const p = tween(frame, at(b) - 6, 12);
            const x1 = A.x;
            const y1 = A.y + 110;
            const x2 = B.x;
            const y2 = B.y;
            const midY = (y1 + y2) / 2;
            return (
              <path
                key={i}
                d={`M${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                stroke={C.flare}
                strokeOpacity={0.6}
                strokeWidth={3}
                strokeDasharray="1"
                pathLength={1}
                strokeDashoffset={1 - p}
                fill="none"
              />
            );
          })}
          {travel > 0 && travel < 1 && (
            <circle cx={380} cy={dotY} r={11} fill={C.flare} style={{ filter: "drop-shadow(0 0 10px rgba(255,51,0,0.8))" }} />
          )}
        </svg>
        {nodes.map((n, i) => {
          const s = useSpring(at(i), 12);
          const w = n.w ?? 440;
          const active = travel > 0 && Math.abs(dotY - (n.y + 55)) < 60 && i < 4;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: n.x - w / 2,
                top: n.y,
                width: w,
                height: 110,
                background: C.white,
                borderRadius: 20,
                border: `2px solid ${active ? C.flare : C.border}`,
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "0 22px",
                transform: `scale(${s})`,
                boxShadow: active
                  ? "0 20px 40px -16px rgba(255,51,0,0.45)"
                  : "0 16px 30px -20px rgba(26,22,20,0.3)",
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: i === 0 ? C.flare : C.peach,
                  color: i === 0 ? C.white : C.flare,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {n.icon}
              </div>
              <div>
                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>{n.title}</div>
                <div style={{ fontSize: 23, color: C.muted, whiteSpace: "nowrap" }}>{n.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};