import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  Chip,
  Cursor,
  FadeUp,
  Hand,
  Logo,
  MailIcon,
  Scribble,
  Sparkle,
  Word,
  Words,
  useSpring,
} from "./components";
import { C, EASE, EASE_IN, sans, tween } from "./theme";

const center: React.CSSProperties = {
  alignItems: "center",
  justifyContent: "center",
  fontFamily: sans,
  color: C.ink,
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const tile = useSpring(4, 11, 0.7);
  const draw = tween(frame, 16, 20);
  const open = tween(frame, 36, 26);
  const letters = "Lumail".split("");
  const zoom = interpolate(frame, [0, 120], [1.08, 1]);

  return (
    <AbsoluteFill style={{ ...center, transform: `scale(${zoom})` }}>
      {[0, 1, 2].map((i) => {
        const t = tween(frame, 8 + i * 7, 40);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 260,
              height: 260,
              borderRadius: 80,
              border: `3px solid ${C.flare}`,
              transform: `scale(${0.6 + t * 2.6}) rotate(${t * 20}deg)`,
              opacity: (1 - t) * 0.5 * (t > 0 ? 1 : 0),
            }}
          />
        );
      })}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            transform: `scale(${tile}) rotate(${(1 - tile) * -140}deg)`,
            filter: `drop-shadow(0 30px 40px rgba(255,51,0,${0.35 * tile}))`,
          }}
        >
          <Logo size={230} id="intro" draw={draw} />
        </div>
        <div
          style={{
            maxWidth: open * 640,
            overflow: "hidden",
            paddingLeft: open * 46,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontSize: 196, fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.1 }}>
            {letters.map((l, i) => (
              <Word key={i} delay={40 + i * 3}>
                {l}
              </Word>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 720, fontSize: 46, color: C.muted, fontWeight: 500 }}>
        <Words text="The AI-native email platform." delay={62} stagger={4} />
      </div>
      <FadeUp delay={78} style={{ position: "absolute", top: 800 }}>
        <Hand style={{ fontSize: 50, color: C.flare, fontWeight: 700 }}>now launching →</Hand>
      </FadeUp>
    </AbsoluteFill>
  );
};

const pains = [
  { t: "Fighting templates", x: 230, y: 150, r: -6 },
  { t: "Picking settings", x: 1330, y: 140, r: 5 },
  { t: "Tuesday-night campaigns", x: 220, y: 830, r: 4 },
  { t: "Looks like 2019", x: 1380, y: 840, r: -5 },
];

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const underline = tween(frame, 46, 22);
  return (
    <AbsoluteFill style={center}>
      {pains.map((p, i) => {
        const s = useSpring(12 + i * 7, 9, 0.8);
        const strike = tween(frame, 70 + i * 4, 10);
        const out = tween(frame, 88 + i * 3, 16, 0, 1, EASE_IN);
        return (
          <div
            key={p.t}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              transform: `scale(${s}) rotate(${p.r + out * p.r * 3}deg) translateY(${out * -120}px)`,
              opacity: 1 - out,
              background: C.white,
              border: `1.5px solid ${C.border}`,
              borderRadius: 18,
              padding: "18px 28px",
              fontSize: 36,
              fontWeight: 500,
              color: C.muted,
              boxShadow: "0 20px 40px -20px rgba(26,22,20,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <span style={{ color: "#b8b0a8", fontSize: 30 }}>✕</span>
            <span style={{ position: "relative" }}>
              {p.t}
              <span
                style={{
                  position: "absolute",
                  left: -4,
                  top: "52%",
                  height: 5,
                  borderRadius: 4,
                  width: `${strike * 104}%`,
                  background: C.flare,
                }}
              />
            </span>
          </div>
        );
      })}
      <div
        style={{
          fontSize: 118,
          fontWeight: 600,
          letterSpacing: "-0.045em",
          lineHeight: 1.04,
          textAlign: "center",
          marginTop: -40,
        }}
      >
        <div>
          <Words text="Running email marketing" delay={0} stagger={4} />
        </div>
        <div>
          <Words text="shouldn't feel like a" delay={14} stagger={4} />
        </div>
        <div style={{ display: "inline-block", position: "relative" }}>
          <Words text="second job." delay={30} stagger={5} style={{ color: C.flare }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: -34 }}>
            <Scribble progress={underline} width={620} strokeWidth={9} />
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 820,
          clipPath: `inset(0 ${100 - tween(frame, 96, 30, 0, 100, EASE)}% 0 0)`,
        }}
      >
        <Hand style={{ fontSize: 76, fontWeight: 700, color: C.ink }}>
          Write the email. <span style={{ color: C.flare }}>We handle the rest.</span>
        </Hand>
      </div>
    </AbsoluteFill>
  );
};

export const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [0, 165], [1, 1.05]);
  const typed = "yourdomain.com".slice(0, Math.floor(tween(frame, 84, 26, 0, 14, (t) => t)));
  const cx = interpolate(frame, [100, 124], [1500, 1010], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const cy = interpolate(frame, [100, 124], [1040, 812], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const press = tween(frame, 126, 4) - tween(frame, 131, 6);
  const ripple = tween(frame, 128, 22);
  const cursorIn = tween(frame, 98, 8);

  return (
    <AbsoluteFill style={{ ...center, transform: `scale(${push})` }}>
      <div
        style={{
          fontSize: 124,
          fontWeight: 600,
          letterSpacing: "-0.045em",
          lineHeight: 1.12,
          textAlign: "center",
          marginTop: 10,
          zoom: 0.92,
        }}
      >
        <div>
          <Word delay={2}>The</Word>{" "}
          <Chip
            delay={8}
            fontSize={124}
            icon={<Sparkle size={96} rotate={interpolate(frame, [8, 60], [-90, 0], { extrapolateRight: "clamp" })} />}
          >
            AI Tool
          </Chip>{" "}
          <Word delay={14}>that</Word>
        </div>
        <div>
          <Words text="will make you love" delay={20} stagger={4} />
        </div>
        <div>
          <Chip delay={36} fontSize={124} icon={<MailIcon size={92} />}>
            e-mail
          </Chip>{" "}
          <Word delay={42} style={{ color: C.flare }}>
            marketing
          </Word>
        </div>
      </div>
      <FadeUp delay={56} style={{ fontSize: 38, color: C.muted, marginTop: 34, textAlign: "center" }}>
        You'll actually like sending emails. And you'll make more money.
      </FadeUp>
      <FadeUp delay={72} style={{ marginTop: 40, width: 760 }}>
        <div
          style={{
            height: 82,
            background: C.white,
            border: `1.5px solid ${C.border}`,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "0 26px",
            fontSize: 32,
            color: typed ? C.ink : "#a39b93",
          }}
        >
          <span style={{ fontSize: 30, color: "#a39b93" }}>◍</span>
          <span>
            {typed || "yourdomain.com"}
            {frame > 84 && frame < 120 && Math.floor(frame / 8) % 2 === 0 ? (
              <span style={{ color: C.flare }}>|</span>
            ) : null}
          </span>
        </div>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            marginTop: 16,
            height: 88,
            borderRadius: 16,
            background: C.flare,
            color: C.white,
            fontSize: 36,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `inset 0 -5px 0 ${C.flareDeep}, 0 20px 40px -18px rgba(255,51,0,0.6)`,
            transform: `scale(${1 - press * 0.04})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 250 - 600 * ripple,
              top: 44 - 600 * ripple,
              width: 1200 * ripple,
              height: 1200 * ripple,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              opacity: 1 - ripple,
            }}
          />
          Start free →
        </div>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 26, color: C.muted }}>
          3,000 emails/month free · no card
        </div>
      </FadeUp>
      <div style={{ opacity: cursorIn }}>
        <Cursor x={cx} y={cy} press={press} />
      </div>
    </AbsoluteFill>
  );
};
