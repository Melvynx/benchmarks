import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Check, Eyebrow, FadeUp, Hand, Logo, MailIcon, Word, Words, useSpring } from "./components";
import { C, fmt, mono, sans, tween } from "./theme";

const base: React.CSSProperties = { fontFamily: sans, color: C.ink };

type Seg = [string, string];
const K = "#ff7b72";
const S = "#a5d6ff";
const F = "#d2a8ff";
const P = "#79c0ff";
const T = "#e8e6e3";
const code: Seg[][] = [
  [["import", K], [" { Lumail } ", T], ["from", K], [' "lumail"', S], [";", T]],
  [],
  [["await", K], [" lumail.emails.", T], ["send", F], ["({", T]],
  [["  to", P], [": ", T], ['"you@yourapp.com"', S], [",", T]],
  [["  from", P], [": ", T], ['"login@yourapp.com"', S], [",", T]],
  [["  subject", P], [": ", T], ['"Your login code"', S], [",", T]],
  [["  content", P], [": ", T], ['"Your code: {{code}}"', S], [",", T]],
  [["});", T]],
];

export const Transactional: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = tween(frame, 0, 22);
  const total = code.reduce((a, l) => a + l.reduce((b, s) => b + s[0].length, 0) + 1, 0);
  let budget = Math.floor(tween(frame, 12, 62, 0, total, (t) => t));
  const toast = useSpring(80, 12);

  return (
    <AbsoluteFill style={base}>
      <div
        style={{
          position: "absolute",
          left: 200,
          top: 200,
          width: 900,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 80}px) rotate(${(1 - enter) * -3}deg)`,
        }}
      >
        <div
          style={{
            background: "#0d0e10",
            borderRadius: 26,
            overflow: "hidden",
            boxShadow: "0 60px 120px -40px rgba(26,22,20,0.55), 0 0 0 10px rgba(255,255,255,0.6)",
          }}
        >
          <div
            style={{
              height: 66,
              display: "flex",
              alignItems: "center",
              padding: "0 26px",
              gap: 12,
              borderBottom: "1.5px solid rgba(255,255,255,0.07)",
              fontFamily: mono,
              fontSize: 22,
              color: "#8a8f98",
            }}
          >
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <span key={c} style={{ width: 16, height: 16, borderRadius: 99, background: c }} />
            ))}
            <span
              style={{
                marginLeft: 18,
                color: "#e8e6e3",
                background: "rgba(255,255,255,0.06)",
                padding: "6px 14px",
                borderRadius: 8,
              }}
            >
              send.ts
            </span>
          </div>
          <div style={{ padding: "30px 36px", fontFamily: mono, fontSize: 30, lineHeight: 1.6, minHeight: 470 }}>
            {code.map((line, li) => {
              const out: React.ReactNode[] = [];
              line.forEach(([txt, col], si) => {
                if (budget <= 0) return;
                const part = txt.slice(0, budget);
                budget -= part.length;
                out.push(
                  <span key={si} style={{ color: col }}>
                    {part}
                  </span>,
                );
              });
              budget -= 1;
              return (
                <div key={li} style={{ display: "flex", gap: 26, minHeight: 48 }}>
                  <span style={{ color: "#3d4148", width: 24, textAlign: "right" }}>{li + 1}</span>
                  <span style={{ whiteSpace: "pre" }}>{out}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: -40,
            bottom: -46,
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: C.white,
            border: `1.5px solid ${C.border}`,
            borderRadius: 16,
            padding: "16px 24px",
            fontFamily: mono,
            fontSize: 26,
            transform: `scale(${toast})`,
            boxShadow: "0 24px 50px -20px rgba(26,22,20,0.35)",
          }}
        >
          <Check size={32} />
          queued · <span style={{ color: C.flare }}>priority lane</span>
        </div>
      </div>

      <div style={{ position: "absolute", left: 1190, top: 210, width: 560 }}>
        <Eyebrow delay={6}>Transactional</Eyebrow>
        <div style={{ fontSize: 82, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.02, marginTop: 26 }}>
          <Words text="Replace Resend." delay={10} stagger={4} />{" "}
          <Words text="Same domain." delay={20} stagger={4} style={{ color: C.flare }} />
        </div>
        <FadeUp delay={34} style={{ fontSize: 29, color: C.muted, marginTop: 24, lineHeight: 1.4 }}>
          Receipts, login codes and your newsletter. One dashboard. One bill.
        </FadeUp>
        <Lanes />
      </div>
    </AbsoluteFill>
  );
};

const Lanes: React.FC = () => {
  const frame = useCurrentFrame();
  const inT = tween(frame, 46, 18);
  const lane = (label: string, fast: boolean) => (
    <div style={{ marginTop: 26 }}>
      <div style={{ fontFamily: mono, fontSize: 21, color: fast ? C.flare : C.muted, marginBottom: 10 }}>{label}</div>
      <div
        style={{
          position: "relative",
          height: 58,
          borderRadius: 14,
          background: fast ? C.peach : C.wash,
          border: `1.5px solid ${fast ? "rgba(255,51,0,0.25)" : C.border}`,
          overflow: "hidden",
        }}
      >
        {fast
          ? [0].map((k) => {
              const t = ((frame - 50) % 26) / 26;
              return (
                <div key={k} style={{ position: "absolute", top: 11, left: -60 + t * 640 }}>
                  <div style={{ position: "absolute", right: 30, top: 16, width: 140, height: 4, borderRadius: 4, background: "linear-gradient(90deg, transparent, rgba(255,51,0,0.5))" }} />
                  <MailIcon size={36} />
                </div>
              );
            })
          : Array.from({ length: 12 }).map((_, k) => {
              const x = ((k * 56 + frame * 1.2) % 680) - 60;
              return (
                <div key={k} style={{ position: "absolute", top: 14, left: x, opacity: 0.55 }}>
                  <MailIcon size={30} color="#b8b0a8" />
                </div>
              );
            })}
      </div>
    </div>
  );
  return (
    <div style={{ opacity: inT, transform: `translateY(${(1 - inT) * 30}px)`, marginTop: 14 }}>
      {lane("campaign · 50,000 recipients", false)}
      {lane("login code · instant lane", true)}
    </div>
  );
};

const stats = [
  { big: 3000, label: "emails / month free", sub: "no card" },
  { big: -1, label: "subscribers stored", sub: "never billed" },
  { big: 126, label: "tools for your AI agent", sub: "MCP · API · CLI · SDK" },
];

export const Pricing: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ ...base, alignItems: "center" }}>
      <div
        style={{
          marginTop: 170,
          fontSize: 104,
          fontWeight: 600,
          letterSpacing: "-0.045em",
          lineHeight: 1.08,
          textAlign: "center",
        }}
      >
        <div>
          <Words text="Pay for emails sent." delay={0} stagger={4} />
        </div>
        <div>
          <Words text="Never for subscribers stored." delay={16} stagger={4} style={{ color: C.flare }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 28, marginTop: 80 }}>
        {stats.map((s, i) => {
          const sp = useSpring(38 + i * 7, 12);
          const n = tween(frame, 44 + i * 7, 40);
          const hl = i === 1;
          return (
            <div
              key={s.label}
              style={{
                width: 440,
                padding: "34px 36px",
                borderRadius: 26,
                background: hl ? C.ink : C.white,
                color: hl ? C.white : C.ink,
                border: `1.5px solid ${hl ? C.ink : C.border}`,
                transform: `translateY(${(1 - sp) * 90}px) rotate(${(1 - sp) * (i - 1) * 6}deg)`,
                opacity: Math.min(1, sp * 1.5),
                boxShadow: "0 30px 60px -36px rgba(26,22,20,0.45)",
              }}
            >
              <div
                style={{
                  fontSize: 104,
                  fontWeight: 600,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  color: hl ? C.flareSoft : C.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.big < 0 ? (
                  <span style={{ display: "inline-block", transform: `scale(${0.5 + n * 0.5})` }}>∞</span>
                ) : (
                  fmt(s.big * n)
                )}
              </div>
              <div style={{ fontSize: 32, fontWeight: 500, marginTop: 16 }}>{s.label}</div>
              <div style={{ fontFamily: mono, fontSize: 22, marginTop: 8, color: hl ? "#8a8f98" : C.muted }}>{s.sub}</div>
            </div>
          );
        })}
      </div>
      <FadeUp delay={92} style={{ marginTop: 50 }}>
        <Hand style={{ fontSize: 58, fontWeight: 700, color: C.muted }}>
          Creator plan: <span style={{ color: C.flare }}>$20/mo</span> for 40K emails
        </Hand>
      </FadeUp>
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = useSpring(6, 11, 0.7);
  const btn = useSpring(52, 11);
  const shine = tween(frame, 70, 26);
  const hatch = `repeating-linear-gradient(135deg, rgba(255,255,255,0.14) 0 1.5px, transparent 1.5px 14px)`;
  const zoom = interpolate(frame, [0, 120], [1.04, 1]);

  return (
    <AbsoluteFill style={{ ...base, background: C.flare, alignItems: "center", justifyContent: "center", color: C.white }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(1000px 700px at 50% 45%, rgba(255,255,255,0.18), transparent 70%)",
        }}
      />
      {[0, 1].map((side) => (
        <div
          key={side}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 150,
            [side ? "right" : "left"]: 0,
            backgroundImage: hatch,
            backgroundPosition: `0 ${frame * 0.6}px`,
            borderLeft: side ? "1.5px solid rgba(255,255,255,0.25)" : undefined,
            borderRight: side ? undefined : "1.5px solid rgba(255,255,255,0.25)",
          }}
        />
      ))}
      <div style={{ transform: `scale(${zoom})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              transform: `scale(${logo}) rotate(${(1 - logo) * 120}deg)`,
              filter: "drop-shadow(0 30px 40px rgba(120,20,0,0.35))",
            }}
          >
            <Logo size={190} id="outro" inverted />
          </div>
          <div style={{ fontSize: 176, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.1 }}>
            {"Lumail".split("").map((l, i) => (
              <Word key={i} delay={12 + i * 3}>
                {l}
              </Word>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 500, marginTop: 30, letterSpacing: "-0.02em" }}>
          <Words text="You'll actually like sending emails." delay={30} stagger={3} />
        </div>
        <div
          style={{
            marginTop: 56,
            position: "relative",
            overflow: "hidden",
            background: C.white,
            color: C.flare,
            fontSize: 42,
            fontWeight: 600,
            padding: "26px 64px",
            borderRadius: 20,
            transform: `scale(${btn})`,
            boxShadow: "inset 0 -5px 0 #f1ddd6, 0 30px 60px -20px rgba(120,20,0,0.45)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 120,
              left: `${-30 + shine * 140}%`,
              background: "linear-gradient(90deg, transparent, rgba(255,51,0,0.18), transparent)",
              transform: "skewX(-20deg)",
            }}
          />
          Start free at lumail.io →
        </div>
        <FadeUp delay={66} style={{ marginTop: 26, fontSize: 28, color: "rgba(255,255,255,0.85)", fontFamily: mono }}>
          3,000 emails/month free · no card · no subscriber fees
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
};
