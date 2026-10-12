import type { CSSProperties, ReactNode } from "react"
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion"
import { loadFont } from "@remotion/google-fonts/Geist"
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono"

const { fontFamily: SANS } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] })
const { fontFamily: MONO } = loadMono("normal", { weights: ["400"], subsets: ["latin"] })

// Source: runs/20260929T235909Z-gpt-6-1-sol-codex and
// runs/20260929T235823Z-claude-opus-5-5-medium-cursor-agent (video-generation),
// priced with benchmark-compare/src/lib/model-pricing.ts.
const GPT = {
  name: "GPT-6.1 Sol",
  harness: "Codex",
  accent: "#5EEAD4",
  cost: 0.738,
  outputTokens: "19.5K",
  totalTokens: "3.06M",
  wallTime: "14m 56s",
  perSecond: "$0.016",
  listPrice: "$2 / $10",
  clip: "gpt.mp4",
  still: "gpt_still.jpg",
  traits: ["Dark, monochrome UI", "Product mockups", "Soundtrack included"],
}

const OPUS = {
  name: "Claude Opus 5.5",
  harness: "Cursor Agent",
  accent: "#F0784A",
  cost: 2.026,
  outputTokens: "45.7K",
  totalTokens: "2.99M",
  wallTime: "15m 30s",
  perSecond: "$0.045",
  listPrice: "$4 / $20",
  clip: "opus.mp4",
  still: "opus_still.jpg",
  traits: ["Lumail brand orange", "Kinetic typography", "No audio track"],
}

type Model = typeof GPT

const C = {
  bg: "#09090B",
  surface: "#131316",
  line: "#27272C",
  text: "#F4F4F5",
  muted: "#8B8B94",
}

const OUT = Easing.bezier(0.16, 1, 0.3, 1)

const SCENES = [
  { id: "intro", frames: 120 },
  { id: "prompt", frames: 120 },
  { id: "clips", frames: 360 },
  { id: "price", frames: 240 },
  { id: "stats", frames: 180 },
  { id: "style", frames: 150 },
  { id: "outro", frames: 150 },
] as const

export const TOTAL_FRAMES = SCENES.reduce((sum, s) => sum + s.frames, 0)

function progress(frame: number, delay: number, duration = 22) {
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
}

function Reveal({
  delay = 0,
  y = 40,
  children,
  style,
}: {
  delay?: number
  y?: number
  children: ReactNode
  style?: CSSProperties
}) {
  const frame = useCurrentFrame()
  const p = progress(frame, delay)
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * y}px)`,
        filter: `blur(${(1 - p) * 10}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Scene({
  frames,
  center = false,
  children,
}: {
  frames: number
  center?: boolean
  children: ReactNode
}) {
  const frame = useCurrentFrame()
  const out = interpolate(frame, [frames - 12, frames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  const scale = interpolate(frame, [frames - 12, frames], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })
  return (
    <AbsoluteFill
      style={{
        opacity: out,
        transform: `scale(${scale})`,
        padding: "96px 120px",
        justifyContent: center ? "center" : "flex-start",
      }}
    >
      {children}
    </AbsoluteFill>
  )
}

function Eyebrow({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay} y={16}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 22,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {children}
      </div>
    </Reveal>
  )
}

function Dot({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        boxShadow: `0 0 ${size * 1.5}px ${color}`,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  )
}

function ModelTag({ model, size = 36 }: { model: Model; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.4 }}>
      <Dot color={model.accent} size={size * 0.4} />
      <span style={{ fontSize: size, fontWeight: 600, letterSpacing: -0.5 }}>
        {model.name}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: size * 0.5,
          color: model.accent,
          border: `1px solid ${model.accent}55`,
          background: `${model.accent}14`,
          borderRadius: 999,
          padding: `${size * 0.12}px ${size * 0.4}px`,
        }}
      >
        medium
      </span>
    </div>
  )
}

function Background() {
  const frame = useCurrentFrame()
  const drift = Math.sin(frame / 90) * 60
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line}55 1px, transparent 1px), linear-gradient(90deg, ${C.line}55 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          transform: `translateY(${(frame * 0.4) % 80}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          left: -380 + drift,
          top: -200,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GPT.accent}22, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          right: -380 - drift,
          bottom: -300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${OPUS.accent}26, transparent 65%)`,
        }}
      />
    </AbsoluteFill>
  )
}

/* ---------- 1. Intro ---------- */

function Intro() {
  const frame = useCurrentFrame()
  const vs = progress(frame, 52, 18)
  return (
    <Scene frames={120} center>
      <Eyebrow>Agent benchmarks · Video generation</Eyebrow>
      <div style={{ marginTop: 56, fontSize: 168, fontWeight: 700, letterSpacing: -7, lineHeight: 1 }}>
        <Reveal delay={6}>Same prompt.</Reveal>
        <Reveal delay={18} style={{ color: C.muted }}>
          Two models.
        </Reveal>
      </div>
      <div style={{ marginTop: 96, display: "flex", alignItems: "center", gap: 48 }}>
        <Reveal delay={40} y={0} style={{ transform: `translateX(${(1 - progress(frame, 40)) * -80}px)` }}>
          <ModelTag model={GPT} size={48} />
        </Reveal>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 32,
            color: C.muted,
            opacity: vs,
            transform: `scale(${0.5 + vs * 0.5})`,
          }}
        >
          vs
        </span>
        <Reveal delay={46} y={0} style={{ transform: `translateX(${(1 - progress(frame, 46)) * 80}px)` }}>
          <ModelTag model={OPUS} size={48} />
        </Reveal>
      </div>
    </Scene>
  )
}

/* ---------- 2. Prompt ---------- */

const PROMPT =
  "Make a dynamic 45-second motion graphics video that shows what an incredible motion designer you are for Lumail.io. Search everything about Lumail, use the same art direction, 16:9 format. Save the finished video as video.mp4."

function Prompt() {
  const frame = useCurrentFrame()
  const chars = Math.floor(interpolate(frame, [14, 84], [0, PROMPT.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
  const cursorOn = Math.floor(frame / 8) % 2 === 0
  return (
    <Scene frames={120} center>
      <Eyebrow>The task</Eyebrow>
      <Reveal delay={4} style={{ marginTop: 28, fontSize: 88, fontWeight: 700, letterSpacing: -3 }}>
        A 45-second launch video for Lumail.
      </Reveal>
      <Reveal
        delay={10}
        style={{
          marginTop: 56,
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 28,
          padding: "44px 52px",
          fontFamily: MONO,
          fontSize: 34,
          lineHeight: 1.55,
          color: "#D4D4D8",
          minHeight: 300,
        }}
      >
        <span style={{ color: C.muted }}>{"> "}</span>
        {PROMPT.slice(0, chars)}
        <span style={{ opacity: cursorOn ? 1 : 0, color: C.text }}>▍</span>
      </Reveal>
      <div style={{ marginTop: 40, display: "flex", gap: 20 }}>
        {["45 seconds", "1920 × 1080", "One autonomous run", "Medium effort"].map((chip, i) => (
          <Reveal key={chip} delay={70 + i * 6} y={20}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 26,
                color: C.text,
                border: `1px solid ${C.line}`,
                borderRadius: 999,
                padding: "12px 26px",
                background: "#ffffff08",
              }}
            >
              {chip}
            </span>
          </Reveal>
        ))}
      </div>
    </Scene>
  )
}

/* ---------- 3. Side-by-side clips ---------- */

const SEGMENTS = [
  { at: 3, label: "Opening" },
  { at: 18, label: "Feature beat" },
  { at: 40, label: "End card" },
]
const SEGMENT_FRAMES = 110

function ClipPanel({ model, delay }: { model: Model; delay: number }) {
  const frame = useCurrentFrame()
  const p = progress(frame, delay, 26)
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.94 + p * 0.06})` }}>
      <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <ModelTag model={model} size={34} />
        <span style={{ fontFamily: MONO, fontSize: 20, color: C.muted }}>{model.harness}</span>
      </div>
      <div
        style={{
          width: 800,
          height: 450,
          borderRadius: 22,
          overflow: "hidden",
          position: "relative",
          border: `2px solid ${model.accent}66`,
          boxShadow: `0 40px 120px -30px ${model.accent}55`,
          background: "#000",
        }}
      >
        {SEGMENTS.map((seg, i) => (
          <Sequence key={seg.at} from={30 + i * SEGMENT_FRAMES} durationInFrames={SEGMENT_FRAMES} layout="none">
            <OffthreadVideo
              src={staticFile(model.clip)}
              startFrom={seg.at * 30}
              muted
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
            <Flash />
          </Sequence>
        ))}
      </div>
    </div>
  )
}

function Flash() {
  const frame = useCurrentFrame()
  const o = interpolate(frame, [0, 8], [0.7, 0], { extrapolateRight: "clamp" })
  return <AbsoluteFill style={{ background: "#fff", opacity: o }} />
}

function Clips() {
  const frame = useCurrentFrame()
  const index = Math.min(SEGMENTS.length - 1, Math.max(0, Math.floor((frame - 30) / SEGMENT_FRAMES)))
  const seg = SEGMENTS[index]
  const local = frame - 30 - index * SEGMENT_FRAMES
  const labelIn = progress(local, 0, 14)
  const fmt = (s: number) => `00:${String(s).padStart(2, "0")}`
  return (
    <Scene frames={360}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <Eyebrow>The generations</Eyebrow>
          <Reveal delay={4} style={{ marginTop: 20, fontSize: 72, fontWeight: 700, letterSpacing: -2.5 }}>
            Side by side, same timestamps.
          </Reveal>
        </div>
        <div
          style={{
            opacity: frame > 30 ? labelIn : 0,
            transform: `translateY(${(1 - labelIn) * 16}px)`,
            textAlign: "right",
            fontFamily: MONO,
          }}
        >
          <div style={{ fontSize: 22, color: C.muted, letterSpacing: 3, textTransform: "uppercase" }}>
            {`${index + 1}/${SEGMENTS.length} · ${seg.label}`}
          </div>
          <div style={{ fontSize: 34, marginTop: 8 }}>{`${fmt(seg.at)} → ${fmt(seg.at + 4)}`}</div>
        </div>
      </div>
      <div style={{ marginTop: 64, display: "flex", justifyContent: "space-between" }}>
        <ClipPanel model={GPT} delay={10} />
        <ClipPanel model={OPUS} delay={18} />
      </div>
    </Scene>
  )
}

/* ---------- 4. Price ---------- */

function PriceRow({ model, delay, max }: { model: Model; delay: number; max: number }) {
  const frame = useCurrentFrame()
  const p = progress(frame, delay, 50)
  const value = model.cost * p
  const width = (model.cost / max) * 1080 * p
  return (
    <Reveal delay={delay - 8} style={{ display: "flex", alignItems: "center", gap: 48 }}>
      <div style={{ width: 420 }}>
        <ModelTag model={model} size={36} />
      </div>
      <div style={{ flex: 1, height: 88, background: "#ffffff08", borderRadius: 20, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            width,
            height: "100%",
            borderRadius: 20,
            background: `linear-gradient(90deg, ${model.accent}55, ${model.accent})`,
            boxShadow: `0 0 60px ${model.accent}66`,
          }}
        />
      </div>
      <div style={{ width: 260, textAlign: "right", fontSize: 96, fontWeight: 700, letterSpacing: -3, fontVariantNumeric: "tabular-nums" }}>
        ${value.toFixed(2)}
      </div>
    </Reveal>
  )
}

function Price() {
  const frame = useCurrentFrame()
  const badge = progress(frame, 110, 24)
  const ratio = OPUS.cost / GPT.cost
  return (
    <Scene frames={240} center>
      <Eyebrow>The bill</Eyebrow>
      <Reveal delay={4} style={{ marginTop: 20, fontSize: 88, fontWeight: 700, letterSpacing: -3 }}>
        What each video cost.
      </Reveal>
      <Reveal delay={10} y={12} style={{ marginTop: 16, fontSize: 30, color: C.muted }}>
        Estimated from recorded token usage at official list prices.
      </Reveal>
      <div style={{ marginTop: 90, display: "flex", flexDirection: "column", gap: 56 }}>
        <PriceRow model={GPT} delay={26} max={OPUS.cost} />
        <PriceRow model={OPUS} delay={40} max={OPUS.cost} />
      </div>
      <div
        style={{
          marginTop: 80,
          display: "flex",
          alignItems: "center",
          gap: 36,
          opacity: badge,
          transform: `scale(${0.85 + badge * 0.15})`,
          transformOrigin: "left center",
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: -2,
            color: C.bg,
            background: GPT.accent,
            borderRadius: 24,
            padding: "10px 36px",
          }}
        >
          {ratio.toFixed(1)}× cheaper
        </span>
        <span style={{ fontSize: 36, color: C.text, maxWidth: 1300, lineHeight: 1.3 }}>
          GPT-6.1 Sol delivered its video for{" "}
          <span style={{ color: GPT.accent }}>{Math.round((GPT.cost / OPUS.cost) * 100)}%</span> of Opus 5.5's price.
        </span>
      </div>
    </Scene>
  )
}

/* ---------- 5. Stats ---------- */

const STATS: { label: string; key: keyof Model }[] = [
  { label: "Output tokens", key: "outputTokens" },
  { label: "Tokens processed", key: "totalTokens" },
  { label: "Wall time", key: "wallTime" },
  { label: "Cost per video second", key: "perSecond" },
  { label: "List price in / out (per MTok)", key: "listPrice" },
]

function Stats() {
  const cell: CSSProperties = { width: 440, textAlign: "right", fontVariantNumeric: "tabular-nums" }
  return (
    <Scene frames={180}>
      <Eyebrow>Under the hood</Eyebrow>
      <Reveal delay={4} style={{ marginTop: 20, fontSize: 88, fontWeight: 700, letterSpacing: -3 }}>
        Similar time. Half the output.
      </Reveal>
      <div style={{ marginTop: 64 }}>
        <Reveal delay={10} y={10} style={{ display: "flex", paddingBottom: 24, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: 1 }} />
          <div style={{ ...cell, display: "flex", justifyContent: "flex-end" }}>
            <ModelTag model={GPT} size={30} />
          </div>
          <div style={{ ...cell, display: "flex", justifyContent: "flex-end" }}>
            <ModelTag model={OPUS} size={30} />
          </div>
        </Reveal>
        {STATS.map((row, i) => (
          <Reveal
            key={row.label}
            delay={20 + i * 9}
            y={24}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "26px 0",
              borderBottom: `1px solid ${C.line}`,
              fontSize: 44,
            }}
          >
            <div style={{ flex: 1, color: C.muted, fontSize: 34 }}>{row.label}</div>
            <div style={{ ...cell, color: GPT.accent, fontWeight: 600 }}>{GPT[row.key] as string}</div>
            <div style={{ ...cell, color: OPUS.accent, fontWeight: 600 }}>{OPUS[row.key] as string}</div>
          </Reveal>
        ))}
      </div>
    </Scene>
  )
}

/* ---------- 6. Style ---------- */

function StyleCard({ model, delay }: { model: Model; delay: number }) {
  const frame = useCurrentFrame()
  const zoom = interpolate(frame, [0, 150], [1.02, 1.12])
  return (
    <Reveal delay={delay} y={60}>
      <div
        style={{
          width: 800,
          height: 450,
          borderRadius: 22,
          overflow: "hidden",
          border: `2px solid ${model.accent}66`,
          boxShadow: `0 40px 120px -30px ${model.accent}55`,
        }}
      >
        <Img src={staticFile(model.still)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      </div>
      <div style={{ marginTop: 28 }}>
        <ModelTag model={model} size={34} />
      </div>
      <div style={{ marginTop: 22, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {model.traits.map((trait, i) => (
          <Reveal key={trait} delay={delay + 16 + i * 6} y={14}>
            <span
              style={{
                fontSize: 26,
                border: `1px solid ${model.accent}55`,
                background: `${model.accent}12`,
                borderRadius: 999,
                padding: "10px 22px",
              }}
            >
              {trait}
            </span>
          </Reveal>
        ))}
      </div>
    </Reveal>
  )
}

function Style() {
  return (
    <Scene frames={150}>
      <Eyebrow>Art direction</Eyebrow>
      <Reveal delay={4} style={{ marginTop: 20, fontSize: 72, fontWeight: 700, letterSpacing: -2.5 }}>
        Two very different takes on one brand.
      </Reveal>
      <div style={{ marginTop: 56, display: "flex", justifyContent: "space-between" }}>
        <StyleCard model={GPT} delay={12} />
        <StyleCard model={OPUS} delay={20} />
      </div>
    </Scene>
  )
}

/* ---------- 7. Outro ---------- */

function Outro() {
  return (
    <Scene frames={150}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: 124, fontWeight: 700, letterSpacing: -5, lineHeight: 1.08 }}>
          <Reveal delay={4}>Same 45-second brief.</Reveal>
          <Reveal delay={16}>
            <span style={{ color: GPT.accent }}>{(OPUS.cost / GPT.cost).toFixed(1)}×</span> price gap.
          </Reveal>
          <Reveal delay={28} style={{ color: C.muted }}>
            You pick the winner.
          </Reveal>
        </div>
        <Reveal delay={50} y={16} style={{ marginTop: 80, display: "flex", gap: 48, alignItems: "center" }}>
          <ModelTag model={GPT} size={32} />
          <span style={{ fontSize: 28, color: C.muted, fontFamily: MONO }}>
            ${GPT.cost.toFixed(2)}
          </span>
          <span style={{ width: 1, height: 40, background: C.line }} />
          <ModelTag model={OPUS} size={32} />
          <span style={{ fontSize: 28, color: C.muted, fontFamily: MONO }}>
            ${OPUS.cost.toFixed(2)}
          </span>
        </Reveal>
        <Reveal delay={60} y={10} style={{ marginTop: 40, fontFamily: MONO, fontSize: 22, color: C.muted, letterSpacing: 2 }}>
          AGENT BENCHMARKS · VIDEO-GENERATION · 2026-09-29
        </Reveal>
      </AbsoluteFill>
    </Scene>
  )
}

const COMPONENTS = {
  intro: Intro,
  prompt: Prompt,
  clips: Clips,
  price: Price,
  stats: Stats,
  style: Style,
  outro: Outro,
}

export function Comparison() {
  let from = 0
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: C.text }}>
      <Background />
      {SCENES.map((scene) => {
        const Component = COMPONENTS[scene.id]
        const start = from
        from += scene.frames
        return (
          <Sequence key={scene.id} from={start} durationInFrames={scene.frames}>
            <Component />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
