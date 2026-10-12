import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Color,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type Material,
} from "three";
import { FOODS, stageIndexFor, STAGES, type FoodId, type Reaction } from "../game/content";
import {
  ball,
  BED_POS,
  bubble,
  constrain,
  controls,
  cowEvents,
  drag,
  env,
  forward,
  pet,
  pointer,
  rand,
  ROAM_RADIUS,
} from "../game/runtime";
import { useGame } from "../game/store";
import { sfx } from "../game/audio";
import { CONFETTI, emit, HEARTS } from "./fx";
import { heartGeometry, radialTexture } from "./shapes";
import { useEmote, type Emote } from "../ui/PetBubble";

const damp = MathUtils.damp;
const bubbleV = new Vector3();
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const easeOutBack = (x: number) => {
  const c1 = 1.7;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const wrap = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

type ActKind =
  | "eat"
  | "love"
  | "yum"
  | "treat"
  | "spicy"
  | "bleh"
  | "refuse"
  | "boop"
  | "giggle"
  | "dizzy"
  | "oops"
  | "yawn"
  | "moo"
  | "sadmoo"
  | "hop"
  | "spin"
  | "sneeze"
  | "levelup"
  | "shiver"
  | "rinse"
  | "shake"
  | "headbutt"
  | "sniff"
  | "hatch"
  | "look"
  | "stir";

const DUR: Record<ActKind, number> = {
  eat: 1.7,
  love: 2.2,
  yum: 1.2,
  treat: 1.8,
  spicy: 2.6,
  bleh: 1.8,
  refuse: 1.1,
  boop: 0.5,
  giggle: 1.0,
  dizzy: 2.2,
  oops: 1.6,
  yawn: 1.9,
  moo: 1.3,
  sadmoo: 1.9,
  hop: 0.8,
  spin: 1.3,
  sneeze: 1.5,
  levelup: 2.8,
  shiver: 1.2,
  rinse: 2.1,
  shake: 1.4,
  headbutt: 0.45,
  sniff: 2.0,
  hatch: 1.7,
  look: 2.4,
  stir: 0.9,
};

const INTERRUPTIBLE: Partial<Record<ActKind, boolean>> = {
  look: true,
  sniff: true,
  hop: true,
  spin: true,
  moo: true,
  giggle: true,
  boop: true,
  shiver: true,
  sadmoo: true,
};

interface Act {
  kind: ActKind;
  t: number;
  dur: number;
  food?: FoodId;
  ground?: boolean;
  flags: Set<string>;
  last: number;
}

interface Expr {
  eyes: "open" | "happy" | "closed" | "squint";
  lid: number;
  mouth: "smile" | "frown" | "flat";
  open: number;
  tongue: boolean;
  brows: "none" | "sad" | "angry" | "raised";
  blush: number;
  earDroop: number;
  tail: number;
  cheekPuff: number;
  red: number;
}

interface Pose {
  hop: number;
  squash: number;
  roll: number;
  lie: number;
  headDown: number;
  spin: number;
  lunge: number;
  yaw: number;
  pitch: number;
  headRoll: number;
}

const mkAct = (kind: ActKind, extra: Partial<Act> = {}): Act => ({
  kind,
  t: 0,
  dur: DUR[kind],
  flags: new Set(),
  last: 0,
  ...extra,
});

const once = (a: Act, key: string) => {
  if (a.flags.has(key)) return false;
  a.flags.add(key);
  return true;
};

const V = () => new Vector3();
const tmpA = V();
const tmpB = V();
const tmpC = V();
const Z = new Vector3(0, 0, 1);

function Patch({
  dir,
  size,
  material,
  depth = 0.895,
  groupRef,
}: {
  dir: [number, number, number];
  size: [number, number];
  material: Material;
  depth?: number;
  groupRef?: (o: Object3D | null) => void;
}) {
  const { pos, quat } = useMemo(() => {
    const n = new Vector3(...dir).normalize();
    return { pos: n.clone().multiplyScalar(depth), quat: new Quaternion().setFromUnitVectors(Z, n) };
  }, [dir, depth]);
  return (
    <group ref={groupRef} position={pos} quaternion={quat}>
      <mesh scale={[size[0], size[1], 0.12]} material={material}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
    </group>
  );
}

const BODY_SPOTS: { dir: [number, number, number]; size: [number, number] }[] = [
  { dir: [0.95, 0.35, 0.15], size: [0.42, 0.36] },
  { dir: [-0.9, 0.25, -0.35], size: [0.46, 0.38] },
  { dir: [0.25, 0.85, -0.5], size: [0.36, 0.3] },
  { dir: [0.55, 0.05, -0.85], size: [0.3, 0.26] },
  { dir: [-0.55, 0.65, 0.5], size: [0.26, 0.22] },
];

const MUD: { dir: [number, number, number]; size: [number, number]; head?: boolean }[] = [
  { dir: [0.7, 0.2, 0.7], size: [0.2, 0.15] },
  { dir: [-0.75, -0.15, 0.55], size: [0.24, 0.17] },
  { dir: [0.1, 0.9, 0.35], size: [0.2, 0.16] },
  { dir: [-0.3, -0.55, -0.7], size: [0.22, 0.16] },
  { dir: [0.85, -0.35, -0.3], size: [0.18, 0.14] },
  { dir: [0.45, 0.55, 0.65], size: [0.2, 0.15], head: true },
];
const MUD_THRESH = [74, 62, 50, 38, 26, 15];

function useCowMaterials() {
  return useMemo(() => {
    const fur = new MeshPhysicalMaterial({
      color: "#fffaf3",
      roughness: 0.78,
      sheen: 1,
      sheenColor: new Color("#ffffff"),
      sheenRoughness: 0.5,
    });
    return {
      fur,
      headFur: fur.clone(),
      spot: new MeshPhysicalMaterial({ color: "#3d3346", roughness: 0.7, sheen: 0.7, sheenColor: new Color("#9a88aa"), sheenRoughness: 0.5 }),
      muzzle: new MeshPhysicalMaterial({ color: "#ffbccb", roughness: 0.55, sheen: 0.6, sheenColor: new Color("#fff0f4") }),
      nostril: new MeshStandardMaterial({ color: "#d9728e", roughness: 0.6 }),
      hoof: new MeshStandardMaterial({ color: "#6e5566", roughness: 0.45 }),
      horn: new MeshStandardMaterial({ color: "#f7e3b5", roughness: 0.4 }),
      earInner: new MeshStandardMaterial({ color: "#ffb0c4", roughness: 0.7 }),
      eye: new MeshPhysicalMaterial({ color: "#241c2b", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 }),
      white: new MeshBasicMaterial({ color: "#ffffff" }),
      line: new MeshStandardMaterial({ color: "#35273c", roughness: 0.6 }),
      mouthIn: new MeshStandardMaterial({ color: "#7a2f45", roughness: 0.7 }),
      tongue: new MeshStandardMaterial({ color: "#ff7f9e", roughness: 0.5 }),
      cheek: new MeshBasicMaterial({ color: "#ff8fb0", transparent: true, opacity: 0.4, depthWrite: false }),
      mud: new MeshStandardMaterial({ color: "#8b6a4e", roughness: 1 }),
      gold: new MeshStandardMaterial({ color: "#ffcc40", roughness: 0.25, metalness: 0.75, emissive: "#7a5500", emissiveIntensity: 0.25 }),
      collar: new MeshStandardMaterial({ color: "#ff5a6e", roughness: 0.5 }),
      scarf: new MeshStandardMaterial({ color: "#7fc8ff", roughness: 0.95 }),
      scarfStripe: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 }),
      party: new MeshStandardMaterial({ color: "#b79cff", roughness: 0.6 }),
      partyBand: new MeshStandardMaterial({ color: "#ffd166", roughness: 0.6 }),
      straw: new MeshStandardMaterial({ color: "#f2cf7a", roughness: 0.9 }),
      ribbon: new MeshStandardMaterial({ color: "#ff6f91", roughness: 0.6 }),
      leaf: new MeshStandardMaterial({ color: "#6cc36e", roughness: 0.8 }),
      shades: new MeshPhysicalMaterial({ color: "#2a2033", roughness: 0.1, clearcoat: 1 }),
      shadesFrame: new MeshStandardMaterial({ color: "#ff6fa3", roughness: 0.4 }),
      gem: new MeshStandardMaterial({ color: "#ff4f8a", roughness: 0.15, emissive: "#ff2d6f", emissiveIntensity: 0.3 }),
      fly: new MeshStandardMaterial({ color: "#2b2530" }),
      wing: new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.7 }),
      cloud: new MeshStandardMaterial({ color: "#e9f2ff", roughness: 1, emissive: "#c4d8f5", emissiveIntensity: 0.3 }),
      shadow: new MeshBasicMaterial({
        map: radialTexture("rgba(40,28,70,0.5)", "rgba(40,28,70,0)"),
        transparent: true,
        depthWrite: false,
      }),
    };
  }, []);
}

type CowMats = ReturnType<typeof useCowMaterials>;

function Accessory({ id, m }: { id: string | null; m: CowMats }) {
  if (!id) return null;
  switch (id) {
    case "flowers":
      return (
        <group position={[0, 0.34, -0.02]} rotation={[-0.2, 0, 0.08]}>
          <mesh material={m.leaf} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.31, 0.028, 8, 32]} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const cols = ["#ff8fb1", "#ffd166", "#ffffff", "#c3a6ff"];
            return (
              <group key={i} position={[Math.cos(a) * 0.31, 0.03, Math.sin(a) * 0.31]}>
                <mesh scale={[0.06, 0.035, 0.06]}>
                  <sphereGeometry args={[1, 12, 8]} />
                  <meshStandardMaterial color={cols[i % cols.length]} roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.025, 0]} scale={0.022}>
                  <sphereGeometry args={[1, 8, 6]} />
                  <meshStandardMaterial color="#ffcf4a" />
                </mesh>
              </group>
            );
          })}
        </group>
      );
    case "party":
      return (
        <group position={[0.1, 0.42, 0.02]} rotation={[-0.1, 0, -0.28]}>
          <mesh material={m.party} position={[0, 0.18, 0]} castShadow>
            <coneGeometry args={[0.16, 0.38, 20]} />
          </mesh>
          {[0.06, 0.18].map((y) => (
            <mesh key={y} material={m.partyBand} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.16 - y * 0.42, 0.018, 6, 24]} />
            </mesh>
          ))}
          <mesh material={m.white} position={[0, 0.39, 0]}>
            <sphereGeometry args={[0.05, 12, 10]} />
          </mesh>
        </group>
      );
    case "straw":
      return (
        <group position={[0, 0.38, -0.03]} rotation={[-0.15, 0, 0.1]}>
          <mesh material={m.straw} castShadow>
            <cylinderGeometry args={[0.56, 0.58, 0.03, 32]} />
          </mesh>
          <mesh material={m.straw} position={[0, 0.11, 0]} castShadow>
            <cylinderGeometry args={[0.27, 0.31, 0.22, 24]} />
          </mesh>
          <mesh material={m.ribbon} position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.315, 0.315, 0.06, 24]} />
          </mesh>
          <mesh material={m.leaf} position={[0.28, 0.07, 0.12]} rotation={[0, 0, 0.5]} scale={[0.08, 0.03, 0.05]}>
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        </group>
      );
    case "crown":
      return (
        <group position={[0, 0.42, 0]} rotation={[-0.12, 0, -0.06]}>
          <mesh material={m.gold} position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.12, 20, 1, true]} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <group key={i}>
                <mesh material={m.gold} position={[Math.cos(a) * 0.2, 0.15, Math.sin(a) * 0.2]}>
                  <coneGeometry args={[0.045, 0.1, 6]} />
                </mesh>
                <mesh material={m.gold} position={[Math.cos(a) * 0.2, 0.21, Math.sin(a) * 0.2]}>
                  <sphereGeometry args={[0.022, 8, 6]} />
                </mesh>
              </group>
            );
          })}
          <mesh material={m.gem} position={[0, 0.06, 0.215]}>
            <octahedronGeometry args={[0.045, 0]} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

function FaceAccessory({ id, m }: { id: string | null; m: CowMats }) {
  if (id !== "shades") return null;
  const heart = heartGeometry();
  return (
    <group position={[0, 0.05, 0.47]}>
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.19, 0, sd === 0 ? 0 : -0.02]} rotation={[0, sd * 0.35, 0]}>
          <mesh geometry={heart} material={m.shadesFrame} scale={[0.26, 0.24, 0.05]} />
          <mesh geometry={heart} material={m.shades} position={[0, 0, 0.012]} scale={[0.21, 0.19, 0.05]} />
        </group>
      ))}
      <mesh material={m.shadesFrame} position={[0, 0.03, 0.01]}>
        <boxGeometry args={[0.14, 0.025, 0.02]} />
      </mesh>
    </group>
  );
}

function NeckAccessory({ id, m }: { id: string | null; m: CowMats }) {
  if (id === "bell")
    return (
      <group>
        <mesh material={m.collar} position={[0, 0.9, 0.33]} rotation={[-0.9, 0, 0]}>
          <torusGeometry args={[0.36, 0.04, 10, 36]} />
        </mesh>
        <group position={[0, 0.64, 0.67]}>
          <mesh material={m.gold} castShadow>
            <sphereGeometry args={[0.075, 16, 12]} />
          </mesh>
          <mesh material={m.line} position={[0, -0.03, 0.06]} scale={[0.04, 0.012, 0.02]}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
        </group>
      </group>
    );
  if (id === "scarf")
    return (
      <group>
        <mesh material={m.scarf} position={[0, 0.9, 0.33]} rotation={[-0.9, 0, 0]} castShadow>
          <torusGeometry args={[0.37, 0.075, 12, 36]} />
        </mesh>
        <mesh material={m.scarfStripe} position={[0, 0.9, 0.33]} rotation={[-0.9, 0, 0]}>
          <torusGeometry args={[0.37, 0.078, 6, 36, 0.35]} />
        </mesh>
        <mesh material={m.scarf} position={[0.2, 0.55, 0.62]} rotation={[0.3, 0, 0.25]} castShadow>
          <boxGeometry args={[0.13, 0.3, 0.05]} />
        </mesh>
        <mesh material={m.scarfStripe} position={[0.23, 0.44, 0.655]} rotation={[0.3, 0, 0.25]}>
          <boxGeometry args={[0.135, 0.04, 0.055]} />
        </mesh>
      </group>
    );
  return null;
}

export function Cow() {
  const m = useCowMaterials();
  const hatched = useGame((s) => s.hatched);
  const equipped = useGame((s) => s.equipped);
  const level = useGame((s) => s.level);
  const stageIdx = stageIndexFor(level);
  const emoteTimer = useRef<number | null>(null);

  const rig = useRef<Record<string, Object3D>>({}).current;
  const bind = (k: string) => (o: Object3D | null) => {
    if (o) rig[k] = o;
  };
  const mudRefs = useRef<(Object3D | null)[]>([]);

  const brain = useRef({
    time: 0,
    act: null as Act | null,
    queue: [] as Act[],
    target: null as { x: number; z: number } | null,
    targetKind: null as null | "wander" | "food" | "bed",
    targetFood: -1,
    targetSince: 0,
    ignore: new Set<number>(),
    ignoreAt: 0,
    idleUntil: 1.5,
    faceCam: true,
    moveSpeed: 0,
    walkPhase: 0,
    blinkAt: 2,
    blinkT: 9,
    flickAt: 3,
    flickT: 9,
    flickSide: 1,
    lastMoo: 0,
    lastAttention: 8,
    lastButt: 0,
    petUntil: 0,
    scrubUntil: 0,
    hover: false,
    boops: [] as number[],
    zzzAt: 0,
    spawnT: -10,
    press: null as null | { x: number; y: number; t: number; dist: number },
    lastMove: { x: 0, y: 0 },
    petAcc: 0,
    scrubAcc: 0,
    strokes: 0,
    lastBubbleSfx: 0,
    sickAmt: 0,
    levelPulse: 0,
    headYaw: 0,
    headPitch: 0,
    a: {
      hop: 0,
      squash: 0,
      roll: 0,
      lie: 0,
      headDown: 0,
      spin: 0,
      lunge: 0,
      yaw: 0,
      pitch: 0,
      headRoll: 0,
      open: 0,
      blush: 0.3,
      lid: 1,
      earDroop: 0,
      tail: 1,
      cheekPuff: 0,
      red: 0,
      scale: STAGES[stageIdx].scale,
      head: STAGES[stageIdx].head,
      cloud: 0,
    },
  }).current;

  const showEmote = (e: Emote, ms = 1400) => {
    useEmote.setState({ emote: { ...e, key: Math.random() } });
    if (emoteTimer.current) window.clearTimeout(emoteTimer.current);
    emoteTimer.current = window.setTimeout(() => useEmote.setState({ emote: null }), ms);
  };

  const start = (kind: ActKind, extra: Partial<Act> = {}, force = false) => {
    const cur = brain.act;
    if (cur && !force && cur.kind === "eat") {
      brain.queue.push(mkAct(kind, extra));
      return;
    }
    brain.act = mkAct(kind, extra);
  };

  useEffect(() => {
    return cowEvents.on((e) => {
      const b = brain;
      switch (e.type) {
        case "eat": {
          start("eat", { food: e.food, ground: e.ground }, true);
          const react: Record<Reaction, ActKind> = { love: "love", yum: "yum", treat: "treat", spicy: "spicy", bleh: "bleh" };
          b.queue = [mkAct(react[e.reaction])];
          b.target = null;
          break;
        }
        case "refuse":
          if (!b.act || INTERRUPTIBLE[b.act.kind]) {
            start("refuse");
            showEmote({ text: e.reason === "full" ? "I'm full!" : "One sec!" });
          }
          break;
        case "boop": {
          b.boops = b.boops.filter((x) => b.time - x < 2.5);
          b.boops.push(b.time);
          if (b.boops.length >= 5) {
            b.boops = [];
            start("dizzy", {}, true);
            showEmote({ icon: "dizzy" }, 1800);
          } else if (!b.act || INTERRUPTIBLE[b.act.kind]) {
            start("boop");
          }
          break;
        }
        case "giggle":
          if (!b.act || INTERRUPTIBLE[b.act.kind]) start("giggle");
          break;
        case "poop":
          start("oops");
          showEmote({ text: "oops!" });
          break;
        case "levelup":
          start("levelup");
          b.levelPulse = 1;
          break;
        case "hatch":
          b.spawnT = b.time;
          b.act = mkAct("hatch");
          b.queue = [];
          break;
        case "wake":
          b.act = mkAct("yawn");
          b.queue = [];
          break;
        case "sleep":
          b.act = null;
          b.queue = [];
          b.target = null;
          break;
        case "sick":
          start("shiver");
          break;
        case "rinse":
          b.act = mkAct("rinse");
          b.queue = [mkAct("shake")];
          break;
        case "moo":
          start("moo");
          break;
      }
    });
  }, []);

  useEffect(() => {
    const up = () => {
      const b = brain;
      if (!b.press) return;
      const g = useGame.getState();
      const quick = performance.now() - b.press.t < 350 && b.press.dist < 10;
      if (quick && g.mode !== "clean") {
        if (g.asleep) {
          b.act = mkAct("stir");
          if (Math.random() < 0.5) g.toast(`Shh... ${g.name} is sleeping`, "info");
          g.boop();
        } else {
          g.boop();
        }
      }
      b.press = null;
      if (g.mode !== "clean") controls.enabled(true);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const g = useGame.getState();
    if (!g.hatched) return;
    controls.enabled(false);
    brain.press = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, t: performance.now(), dist: 0 };
    brain.lastMove = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const g = useGame.getState();
    const b = brain;
    const nx = e.nativeEvent.clientX;
    const ny = e.nativeEvent.clientY;
    const d = Math.hypot(nx - b.lastMove.x, ny - b.lastMove.y);
    b.lastMove = { x: nx, y: ny };
    if (!pointer.down || d > 120) return;
    if (b.press) b.press.dist += d;
    if (g.mode === "clean") {
      b.scrubAcc += d;
      b.scrubUntil = b.time + 0.35;
      if (b.scrubAcc > 22) {
        b.scrubAcc = 0;
        emit("bubble", e.point, { count: 3, speed: 0.5, up: 0.5, size: 0.07, sizeJitter: 0.8, life: 1.3, drag: 1.5, radius: 0.08, color: ["#ffffff", "#e6f6ff", "#ffe6f3"] });
        g.scrub(1.7);
        if (b.time - b.lastBubbleSfx > 0.09) {
          b.lastBubbleSfx = b.time;
          sfx.bubble();
        }
        b.strokes++;
        if (b.strokes % 14 === 0) sfx.giggle();
      }
      return;
    }
    if (!b.press || g.asleep) return;
    b.petAcc += d;
    b.petUntil = b.time + 0.9;
    if (b.petAcc > 70) {
      b.petAcc = 0;
      if (g.petStroke(e.point)) {
        emit("heart", e.point.clone().add(tmpA.set(0, 0.1, 0)), { count: 1, speed: 0.2, up: 0.9, size: 0.12, life: 1.1, drag: 1, color: HEARTS, sway: 0.6 });
        b.strokes++;
        if (b.strokes % 3 === 0) sfx.giggle();
        if (b.strokes % 9 === 0) cowEvents.emit({ type: "giggle" });
      }
    }
  };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const b = brain;
    b.time = state.clock.elapsedTime;
    const t = b.time;
    const g = useGame.getState();
    const root = rig.root;
    if (!root) return;
    root.visible = g.hatched;
    if (!g.hatched) return;

    const stage = STAGES[stageIndexFor(g.level)];
    const mooPitch = [1.45, 1.2, 1][stageIndexFor(g.level)];
    const a = b.a;

    const ex: Expr = {
      eyes: "open",
      lid: 1,
      mouth: "smile",
      open: 0,
      tongue: false,
      brows: "none",
      blush: 0.3,
      earDroop: 0,
      tail: 1,
      cheekPuff: 0,
      red: 0,
    };
    const po: Pose = { hop: 0, squash: 0, roll: 0, lie: 0, headDown: 0, spin: 0, lunge: 0, yaw: 0, pitch: 0, headRoll: 0 };

    const { hunger, happy, energy, hygiene } = g.stats;
    if (g.sick) {
      ex.lid = 0.55;
      ex.brows = "sad";
      ex.mouth = "frown";
      ex.earDroop = 1;
      ex.blush = 0;
      ex.tail = 0.4;
    } else if (happy < 35 || hunger < 22) {
      ex.brows = "sad";
      ex.mouth = "frown";
      ex.earDroop = 0.8;
      ex.tail = 0.5;
    } else if (happy > 75) {
      ex.blush = 0.5;
      ex.tail = 1.6;
      ex.earDroop = -0.2;
    }
    if (energy < 25 && !g.asleep) {
      ex.lid = Math.min(ex.lid, 0.6);
      ex.earDroop = Math.max(ex.earDroop, 0.6);
    }

    let look = null as Vector3 | null;
    let walk = null as { x: number; z: number; speed: number; arrive: number } | null;
    let faceHeading = null as number | null;

    const camPos = state.camera.position;
    const toCam = Math.atan2(camPos.x - pet.pos.x, camPos.z - pet.pos.z);

    const act = b.act;
    if (act) {
      act.t += dt;
      const p = clamp01(act.t / act.dur);
      runAct(act, p);
      if (act.t >= act.dur) {
        b.act = b.queue.shift() ?? null;
      }
    } else if (g.asleep) {
      const dx = BED_POS.x - pet.pos.x;
      const dz = BED_POS.z - pet.pos.z;
      if (Math.hypot(dx, dz) > 0.12 && a.lie < 0.5) {
        walk = { x: BED_POS.x, z: BED_POS.z, speed: 0.9, arrive: 0.1 };
        ex.lid = 0.45;
      } else {
        po.lie = 1;
        ex.eyes = "closed";
        ex.blush = 0.35;
        ex.earDroop = 0.7;
        ex.tail = 0.25;
        faceHeading = Math.atan2(-BED_POS.x * 0.3, 6 - BED_POS.z);
        if (t > b.zzzAt) {
          b.zzzAt = t + 1.3;
          emit("zzz", pet.head.clone().add(tmpA.set(0.15, 0.3, 0)), {
            count: 1,
            dir: new Vector3(0.25, 1, 0.1),
            speed: 0.35,
            spread: 0.1,
            size: 0.2 + Math.random() * 0.1,
            life: 2.4,
            drag: 0.2,
            color: "#e8e2ff",
            sway: 0.4,
          });
        }
      }
    } else if (g.drag && drag.valid) {
      const fp = drag.pos;
      const dx = fp.x - pet.pos.x;
      const dz = fp.z - pet.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2.1) walk = { x: fp.x - (dx / dist) * 1.3, z: fp.z - (dz / dist) * 1.3, speed: 1.6, arrive: 0.2 };
      else faceHeading = Math.atan2(dx, dz);
      look = fp;
      const dm = fp.distanceTo(pet.mouth);
      const full = hunger >= 96 && g.drag !== "cupcake";
      if (full) {
        ex.mouth = "flat";
        ex.brows = "raised";
        if (dm < 1.3) {
          po.yaw = 0.7;
          ex.eyes = "closed";
          look = null;
        }
      } else {
        const near = clamp01(1.4 - dm);
        ex.open = near;
        ex.lid = 1.2;
        ex.tail = 3;
        ex.earDroop = -0.5;
        ex.blush = 0.5 + near * 0.4;
        ex.brows = "raised";
        po.hop = Math.abs(Math.sin(t * 10)) * 0.04 * near;
      }
    } else {
      const flying = g.foods.find((f) => f.state === "homing");
      if (flying) {
        look = flying.pos;
        const full = hunger >= 96 && flying.food !== "cupcake" && flying.food !== "pill";
        if (!full) {
          ex.open = clamp01(flying.t * 1.8 - 0.3);
          ex.lid = 1.25;
          ex.brows = "raised";
        }
        faceHeading = Math.atan2(flying.pos.x - pet.pos.x, flying.pos.z - pet.pos.z);
      } else if (g.mode === "play") {
        look = ball.pos;
        ex.lid = 1.15;
        ex.tail = 3;
        ex.open = 0.25;
        ex.blush = 0.5;
        ex.earDroop = -0.3;
        const dx = ball.pos.x - pet.pos.x;
        const dz = ball.pos.z - pet.pos.z;
        const dist = Math.hypot(dx, dz);
        const reach = 0.58 * a.scale + ball.radius;
        const angle = wrap(Math.atan2(dx, dz) - pet.heading);
        if (dist > reach) {
          walk = { x: ball.pos.x, z: ball.pos.z, speed: 2.3 * (energy < 25 ? 0.7 : 1), arrive: reach * 0.85 };
        } else if (Math.abs(angle) > 0.6) {
          faceHeading = Math.atan2(dx, dz);
        } else if (ball.pos.y < 0.8 && t - b.lastButt > 0.7) {
          b.lastButt = t;
          b.act = mkAct("headbutt");
          const f = forward(pet.heading, tmpA);
          const toCenter = tmpB.set(-pet.pos.x, 0, -pet.pos.z).normalize();
          ball.vel.set(f.x * 2.6 + toCenter.x * 0.9 + rand(-0.8, 0.8), 3.4 + rand(0, 1.2), f.z * 2.6 + toCenter.z * 0.9 + rand(-0.8, 0.8));
          g.rallyHit("cow");
          sfx.kick();
          emit("sparkle", ball.pos, { count: 6, speed: 1.6, size: 0.12, life: 0.6, color: ["#fff6b0", "#ffffff"] });
        }
      } else if (g.mode === "clean") {
        faceHeading = toCam;
        look = t - pointer.movedAt < 2 ? pointer.world : camPos;
        if (t < b.scrubUntil) {
          ex.eyes = Math.sin(t * 5) > 0 ? "happy" : "squint";
          ex.blush = 0.9;
          ex.open = 0.3;
          ex.tail = 3;
          po.roll = Math.sin(t * 9) * 0.06;
        }
      } else if (t < b.petUntil) {
        look = pointer.world;
        ex.eyes = "happy";
        ex.blush = 0.9;
        ex.tail = 2.6;
        ex.open = 0.2;
        ex.earDroop = 0.3;
        po.roll = Math.sin(t * 5) * 0.05;
        po.headRoll = 0.22;
      } else {
        const hungryEnough = hunger < 92;
        if (b.ignore.size && t - b.ignoreAt > 15) {
          b.ignore.clear();
          b.ignoreAt = t;
        }
        if (b.targetKind !== "food") {
          let best: { id: number; d: number } | null = null;
          for (const f of g.foods) {
            if (f.state !== "rest" || b.ignore.has(f.id)) continue;
            if (!hungryEnough && f.food !== "cupcake" && f.food !== "pill") continue;
            if (Math.hypot(f.pos.x, f.pos.z) > ROAM_RADIUS + 0.5) continue;
            const d = Math.hypot(f.pos.x - pet.pos.x, f.pos.z - pet.pos.z);
            if (!best || d < best.d) best = { id: f.id, d };
          }
          if (best) {
            b.targetKind = "food";
            b.targetFood = best.id;
            b.targetSince = t;
            b.target = null;
          }
        }
        if (b.targetKind === "food") {
          const f = g.foods.find((x) => x.id === b.targetFood && x.state === "rest");
          if (!f) {
            b.targetKind = null;
          } else {
            look = f.pos;
            ex.lid = 1.15;
            ex.brows = "raised";
            ex.tail = 2;
            const fwd = forward(pet.heading, tmpA);
            const mx = pet.pos.x + fwd.x * 0.62 * a.scale;
            const mz = pet.pos.z + fwd.z * 0.62 * a.scale;
            if (Math.hypot(f.pos.x - mx, f.pos.z - mz) < 0.32) {
              const res = g.feed(f.food, true);
              if (res === "ok") g.removeFood(f.id);
              else b.ignore.add(f.id);
              b.targetKind = null;
            } else if (t - b.targetSince > 7) {
              b.ignore.add(f.id);
              b.targetKind = null;
            } else {
              const d = Math.hypot(f.pos.x - pet.pos.x, f.pos.z - pet.pos.z);
              const ax = f.pos.x - ((f.pos.x - pet.pos.x) / d) * 0.55 * a.scale;
              const az = f.pos.z - ((f.pos.z - pet.pos.z) / d) * 0.55 * a.scale;
              walk = { x: ax, z: az, speed: 1.5, arrive: 0.05 };
              if (d < 0.75 * a.scale) faceHeading = Math.atan2(f.pos.x - pet.pos.x, f.pos.z - pet.pos.z);
            }
          }
        }

        if (b.targetKind !== "food") {
          const critical = g.sick || hunger < 20 || happy < 20 || hygiene < 20 || energy < 15;
          if (critical && t - b.lastAttention > 24) {
            b.lastAttention = t;
            b.act = mkAct("sadmoo");
            showEmote({ text: "!" }, 1500);
          } else if (b.targetKind === "wander" && b.target) {
            walk = { x: b.target.x, z: b.target.z, speed: g.sick ? 0.6 : energy < 25 ? 0.75 : 1.1, arrive: 0.15 };
            if (t - b.targetSince > 7) b.target = null;
          } else if (t > b.idleUntil) {
            pickIdle();
          } else {
            if (b.hover) {
              faceHeading = toCam;
              look = t - pointer.movedAt < 2 ? pointer.world : camPos;
              ex.lid = Math.max(ex.lid, 1.1);
            } else if (b.faceCam) {
              faceHeading = toCam + Math.sin(t * 0.3) * 0.25;
              look = t - pointer.movedAt < 2.5 ? pointer.world : camPos;
            }
          }
        }
      }
    }

    function pickIdle() {
      const r = Math.random();
      b.idleUntil = t + rand(1.8, 4.2);
      b.faceCam = Math.random() < 0.6;
      const wander = () => {
        const ang = Math.random() * Math.PI * 2;
        const dist = rand(1, 2.6);
        const p = constrain({ x: pet.pos.x + Math.cos(ang) * dist, z: pet.pos.z + Math.sin(ang) * dist }, 0.5);
        const pull = constrain({ x: p.x * 0.85, z: p.z * 0.85 + 0.25 }, 0.5);
        b.target = pull;
        b.targetKind = "wander";
        b.targetSince = t;
      };
      if (g.sick) {
        if (r < 0.2) b.act = mkAct("shiver");
        else if (r < 0.32) b.act = mkAct("sneeze");
        else if (r < 0.6) wander();
        return;
      }
      if (energy < 25) {
        if (r < 0.25) b.act = mkAct("yawn");
        else if (r < 0.55) wander();
        return;
      }
      if (r < 0.42) wander();
      else if (r < 0.55) b.act = mkAct("look");
      else if (r < 0.64) b.act = mkAct("sniff");
      else if (r < 0.73 && happy > 55) b.act = mkAct("hop");
      else if (r < 0.79 && happy > 70) b.act = mkAct("spin");
      else if (r < 0.87 && t - b.lastMoo > 14) {
        b.lastMoo = t;
        b.act = mkAct("moo");
      }
    }

    function runAct(ac: Act, p: number) {
      const head = pet.head;
      switch (ac.kind) {
        case "eat": {
          const chomp = p < 0.14;
          if (ac.ground) po.headDown = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) * 4);
          if (once(ac, "chomp")) {
            sfx.chomp();
            emit("crumb", pet.mouth, { count: 7, speed: 1.2, up: 1, size: 0.035, life: 1.2, gravity: 6, color: FOODS[ac.food ?? "clover"].crumb });
          }
          ex.open = chomp ? 1 : 0.1 + 0.42 * Math.max(0, Math.sin(t * 20));
          ex.cheekPuff = chomp ? 0 : 1;
          ex.eyes = ac.food === "pill" ? "squint" : "happy";
          ex.blush = 0.55;
          ex.tail = 2.2;
          po.squash = chomp ? 0.04 : Math.sin(t * 20) * 0.015;
          if (!chomp && t - ac.last > 0.25 && p < 0.9) {
            ac.last = t;
            sfx.crunch();
            emit("crumb", pet.mouth, { count: 2, speed: 0.8, up: 0.6, size: 0.028, life: 1, gravity: 6, color: FOODS[ac.food ?? "clover"].crumb });
          }
          break;
        }
        case "love":
          ex.eyes = "happy";
          ex.blush = 1;
          ex.open = 0.35;
          ex.tail = 3.2;
          ex.earDroop = -0.4;
          po.hop = Math.abs(Math.sin(p * Math.PI * 2)) * 0.32;
          po.roll = Math.sin(p * Math.PI * 4) * 0.08;
          if (once(ac, "a")) {
            emit("heart", head.clone().add(tmpA.set(0, 0.3, 0)), { count: 8, speed: 1.3, up: 1.4, size: 0.14, life: 1.5, drag: 1.4, color: HEARTS, sway: 0.5 });
            sfx.moo(mooPitch * 1.25);
            showEmote({ icon: "heart" }, 1800);
          }
          if (p > 0.5 && once(ac, "b")) emit("heart", head.clone().add(tmpA.set(0, 0.3, 0)), { count: 5, speed: 1, up: 1.2, size: 0.12, life: 1.3, drag: 1.4, color: HEARTS });
          break;
        case "yum":
          ex.eyes = "happy";
          ex.blush = 0.7;
          ex.open = 0.25;
          ex.tail = 2.4;
          po.hop = Math.sin(clamp01((p - 0.15) / 0.5) * Math.PI) * 0.18;
          if (once(ac, "a")) {
            emit("heart", head.clone().add(tmpA.set(0, 0.35, 0)), { count: 3, speed: 0.7, up: 1.1, size: 0.12, life: 1.3, drag: 1.4, color: HEARTS, sway: 0.5 });
            sfx.giggle();
            showEmote({ text: "Yum!" });
          }
          break;
        case "treat":
          ex.eyes = "happy";
          ex.blush = 0.9;
          ex.open = 0.3;
          ex.tail = 3;
          po.spin = easeInOut(clamp01((p - 0.2) / 0.6)) * Math.PI * 2;
          po.hop = Math.sin(clamp01((p - 0.2) / 0.6) * Math.PI) * 0.2;
          if (once(ac, "a")) {
            emit("sparkle", head.clone().add(tmpA.set(0, 0.2, 0)), { count: 12, speed: 1.4, size: 0.14, life: 0.9, radius: 0.3, color: ["#fff3a8", "#ffc6e0", "#ffffff"] });
            sfx.sparkle();
            showEmote({ text: "Sweet!" });
          }
          break;
        case "spicy": {
          ex.red = Math.min(1, p * 5) * (1 - Math.max(0, (p - 0.8) / 0.2));
          ex.eyes = p < 0.22 ? "open" : "squint";
          ex.lid = 1.35;
          ex.open = 0.65 + Math.sin(t * 26) * 0.2;
          ex.brows = "angry";
          ex.tail = 4;
          po.hop = Math.abs(Math.sin(p * Math.PI * 7)) * 0.16;
          po.roll = Math.sin(t * 30) * 0.05;
          if (once(ac, "a")) {
            sfx.sizzle();
            showEmote({ text: "HOT!" }, 1800);
          }
          if (t - ac.last > 0.07 && p > 0.1 && p < 0.85) {
            ac.last = t;
            for (const k of ["earL", "earR"]) {
              const ear = rig[k];
              if (!ear) continue;
              ear.getWorldPosition(tmpB);
              emit("steam", tmpB, { count: 1, speed: 0.4, up: 1.4, size: 0.09, life: 0.8, drag: 1, color: "#ffffff" });
            }
          }
          break;
        }
        case "bleh":
          if (p < 0.62) {
            ex.eyes = "squint";
            ex.tongue = true;
            ex.brows = "angry";
            po.roll = Math.sin(t * 40) * 0.05;
          } else {
            ex.eyes = "happy";
            ex.blush = 0.7;
          }
          if (once(ac, "a")) {
            sfx.deny();
            showEmote({ text: "Bleh!" });
          }
          if (p > 0.62 && once(ac, "heal")) {
            emit("sparkle", pet.pos.clone().add(tmpA.set(0, 0.8 * a.scale, 0)), { count: 18, speed: 1.2, up: 0.8, size: 0.14, life: 1.1, radius: 0.5, color: ["#b7ffcf", "#ffffff", "#9fe7ff"] });
            sfx.sparkle();
          }
          break;
        case "refuse":
          po.yaw = Math.sin(p * Math.PI * 6) * 0.45 * (1 - p);
          ex.mouth = "flat";
          ex.brows = "angry";
          ex.eyes = "closed";
          if (once(ac, "a")) sfx.deny();
          break;
        case "boop":
          po.squash = Math.sin(p * Math.PI) * 0.22;
          ex.eyes = p < 0.5 ? "squint" : "open";
          ex.lid = 1.25;
          ex.blush = 0.8;
          if (once(ac, "a")) {
            sfx.boing();
            emit("sparkle", head.clone().add(tmpA.set(0, 0.45 * a.scale, 0)), { count: 3, speed: 0.8, size: 0.1, life: 0.5, color: "#fff6b0" });
          }
          break;
        case "giggle":
          po.roll = Math.sin(p * Math.PI * 6) * 0.12 * (1 - p);
          ex.eyes = "happy";
          ex.blush = 1;
          ex.open = 0.35;
          ex.tail = 3;
          if (once(ac, "a")) sfx.giggle();
          break;
        case "dizzy":
          po.headRoll = Math.sin(t * 7) * 0.3;
          po.yaw = Math.cos(t * 7) * 0.3;
          ex.eyes = "squint";
          ex.mouth = "flat";
          ex.open = 0.12;
          ex.earDroop = 0.8;
          if (t - ac.last > 0.18) {
            ac.last = t;
            emit("star", head.clone().add(tmpA.set(Math.cos(t * 6) * 0.35, 0.45 * a.scale, Math.sin(t * 6) * 0.35)), { count: 1, speed: 0.1, size: 0.12, life: 0.6 });
          }
          if (once(ac, "a")) sfx.boing();
          break;
        case "oops":
          ex.eyes = "closed";
          ex.blush = 1;
          po.hop = Math.sin(clamp01(p / 0.4) * Math.PI) * 0.12;
          po.yaw = -0.4 * Math.sin(p * Math.PI);
          break;
        case "yawn": {
          const k = Math.sin(clamp01(p / 0.8) * Math.PI);
          ex.open = k;
          ex.eyes = "closed";
          po.pitch = -0.35 * k;
          po.squash = -0.07 * Math.sin(p * Math.PI);
          if (once(ac, "a")) sfx.yawn(mooPitch);
          break;
        }
        case "moo":
          po.pitch = -0.38 * Math.sin(p * Math.PI);
          ex.open = p > 0.08 && p < 0.8 ? 0.6 : 0;
          ex.eyes = "closed";
          ex.blush = 0.5;
          if (once(ac, "a")) {
            sfx.moo(mooPitch);
            showEmote({ text: "Moo!" });
          }
          break;
        case "sadmoo":
          po.pitch = 0.2;
          ex.open = p > 0.1 && p < 0.8 ? 0.35 : 0;
          ex.brows = "sad";
          ex.mouth = "frown";
          ex.earDroop = 1;
          look = state.camera.position;
          faceHeading = toCam;
          if (once(ac, "a")) sfx.sadMoo(mooPitch);
          break;
        case "hop":
          po.hop = Math.sin(clamp01((p - 0.12) / 0.76) * Math.PI) * 0.42;
          po.squash = p < 0.12 ? (p / 0.12) * 0.14 : p > 0.88 ? ((1 - p) / 0.12) * 0.1 : -0.06;
          ex.eyes = "happy";
          ex.open = 0.3;
          ex.tail = 2.5;
          if (p > 0.12 && once(ac, "a")) sfx.pop();
          break;
        case "spin":
          po.spin = easeInOut(p) * Math.PI * 2;
          po.hop = Math.sin(p * Math.PI) * 0.15;
          ex.eyes = "happy";
          ex.open = 0.3;
          ex.tail = 3;
          if (once(ac, "a")) sfx.giggle();
          break;
        case "sneeze":
          if (p < 0.5) {
            po.pitch = -0.4 * (p / 0.5);
            ex.eyes = "squint";
            ex.open = 0.25;
          } else {
            po.pitch = 0.3 * (1 - (p - 0.5) / 0.5);
            ex.open = 0.8 * Math.max(0, 1 - (p - 0.5) * 3);
            ex.eyes = "closed";
          }
          if (p > 0.25 && once(ac, "s")) sfx.sneeze();
          if (p > 0.5 && once(ac, "a")) {
            const f = forward(pet.heading, tmpB);
            emit("drop", pet.mouth, { count: 10, dir: f, speed: 1.6, spread: 0.6, up: 0.5, size: 0.04, life: 0.8, gravity: 5, color: "#d8f3ff" });
            emit("dust", pet.mouth, { count: 4, dir: f, speed: 0.8, size: 0.1, life: 0.7, color: "#ffffff" });
          }
          break;
        case "levelup": {
          const k = clamp01((p - 0.15) / 0.6);
          po.hop = Math.sin(k * Math.PI) * 0.95;
          po.spin = easeInOut(k) * Math.PI * 2;
          po.squash = p < 0.15 ? (p / 0.15) * 0.15 : 0;
          ex.eyes = "happy";
          ex.blush = 0.9;
          ex.open = 0.45;
          ex.tail = 3.5;
          ex.earDroop = -0.5;
          if (once(ac, "e")) showEmote({ icon: "star" }, 2200);
          if (p > 0.42 && once(ac, "a")) {
            emit("confetti", head.clone().add(tmpA.set(0, 0.4, 0)), { count: 80, speed: 3.2, up: 3, size: 0.09, life: 2.6, gravity: 4, drag: 1.2, color: CONFETTI });
            emit("sparkle", head, { count: 20, speed: 2, size: 0.16, life: 1, radius: 0.4, color: ["#fff3a8", "#ffffff", "#ffc6e0"] });
          }
          break;
        }
        case "shiver":
          po.roll = Math.sin(t * 45) * 0.05;
          ex.lid = 0.55;
          ex.brows = "sad";
          ex.mouth = "frown";
          ex.earDroop = 1;
          break;
        case "rinse":
          ex.eyes = "closed";
          ex.blush = 0.6;
          ex.tail = 2;
          ex.earDroop = 0.6;
          if (once(ac, "a")) sfx.rinse();
          if (t - ac.last > 0.025 && p > 0.1 && p < 0.9) {
            ac.last = t;
            const cloud = rig.cloud;
            if (cloud) {
              cloud.getWorldPosition(tmpB);
              emit("drop", tmpB.add(tmpA.set(rand(-0.4, 0.4) * a.scale, -0.1, rand(-0.3, 0.3) * a.scale)), { count: 1, dir: new Vector3(0, -1, 0), speed: 3, spread: 0.05, size: 0.045, life: 0.9, gravity: 4, drag: 0 });
            }
          }
          break;
        case "shake":
          po.roll = Math.sin(t * 32) * 0.3 * Math.sin(p * Math.PI);
          po.headRoll = -po.roll * 1.2;
          ex.eyes = "squint";
          ex.earDroop = Math.sin(t * 32) * 0.8;
          if (t - ac.last > 0.03 && p < 0.8) {
            ac.last = t;
            const ang = Math.random() * Math.PI * 2;
            emit("drop", pet.pos.clone().add(tmpA.set(0, 0.7 * a.scale, 0)), { count: 2, dir: new Vector3(Math.cos(ang), 0.6, Math.sin(ang)), speed: 2.6, spread: 0.3, size: 0.04, life: 0.8, gravity: 6, drag: 0.3 });
          }
          if (p > 0.85 && once(ac, "a")) {
            emit("sparkle", pet.pos.clone().add(tmpA.set(0, 0.8 * a.scale, 0)), { count: 22, speed: 1.4, up: 0.6, size: 0.15, life: 1.2, radius: 0.6, color: ["#ffffff", "#bff0ff", "#fff3a8"] });
            sfx.sparkle();
            showEmote({ icon: "sparkle" }, 1600);
          }
          break;
        case "headbutt":
          po.lunge = Math.sin(p * Math.PI) * 0.3;
          po.pitch = 0.35 * Math.sin(p * Math.PI);
          ex.eyes = p < 0.5 ? "squint" : "happy";
          ex.open = 0.3;
          look = ball.pos;
          break;
        case "sniff":
          po.headDown = 0.85;
          po.yaw = Math.sin(t * 3) * 0.25;
          ex.lid = 0.8;
          if (t - ac.last > 0.45) {
            ac.last = t;
            emit("dust", pet.mouth.clone().setY(0.05), { count: 2, speed: 0.3, up: 0.3, size: 0.06, life: 0.6, color: "#f1e3c8" });
          }
          break;
        case "hatch":
          ex.eyes = p < 0.3 ? "open" : "happy";
          ex.lid = 1.3;
          ex.blush = 0.8;
          ex.open = p > 0.3 ? 0.4 : 0;
          po.hop = Math.sin(clamp01((p - 0.3) / 0.5) * Math.PI) * 0.35;
          look = state.camera.position;
          faceHeading = toCam;
          if (p > 0.3 && once(ac, "a")) {
            sfx.moo(1.6);
            showEmote({ icon: "heart" }, 1800);
          }
          break;
        case "look":
          po.headRoll = 0.28 * Math.sin(clamp01(p / 0.2) * (Math.PI / 2)) * (p > 0.85 ? (1 - p) / 0.15 : 1);
          ex.lid = 1.15;
          look = state.camera.position;
          faceHeading = toCam;
          break;
        case "stir":
          po.lie = 1;
          po.roll = Math.sin(p * Math.PI * 3) * 0.06;
          ex.eyes = "closed";
          ex.mouth = "flat";
          if (once(ac, "a")) {
            emit("zzz", head.clone().add(tmpA.set(0.1, 0.3, 0)), { count: 2, dir: new Vector3(0, 1, 0), speed: 0.4, size: 0.2, life: 1.6, color: "#e8e2ff" });
          }
          break;
      }
    }

    // ---- locomotion
    let moved = 0;
    if (walk) {
      const dx = walk.x - pet.pos.x;
      const dz = walk.z - pet.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= walk.arrive) {
        if (b.targetKind === "wander") {
          b.target = null;
          b.targetKind = null;
          b.idleUntil = t + rand(1, 3);
        }
      } else {
        const desired = Math.atan2(dx, dz);
        const diff = wrap(desired - pet.heading);
        pet.heading += Math.max(-5 * dt, Math.min(5 * dt, diff));
        const sp = walk.speed * Math.max(0, Math.cos(diff)) * Math.min(1, dist / 0.3 + 0.3);
        const f = forward(pet.heading, tmpA);
        const ox = pet.pos.x;
        const oz = pet.pos.z;
        pet.pos.x += f.x * sp * dt;
        pet.pos.z += f.z * sp * dt;
        constrain(pet.pos, 0.45);
        moved = Math.hypot(pet.pos.x - ox, pet.pos.z - oz) / dt;
      }
    } else if (faceHeading !== null) {
      const diff = wrap(faceHeading - pet.heading);
      pet.heading += Math.max(-3 * dt, Math.min(3 * dt, diff)) * Math.min(1, Math.abs(diff) * 3);
    }
    b.moveSpeed = damp(b.moveSpeed, moved, 10, dt);
    const walkAmt = clamp01(b.moveSpeed / 1.1);
    b.walkPhase += b.moveSpeed * dt * 9 / Math.max(0.6, a.scale);

    // ---- blink & ear flicks
    if (t > b.blinkAt) {
      b.blinkT = 0;
      b.blinkAt = t + (Math.random() < 0.2 ? 0.25 : rand(2, 5.5));
    }
    b.blinkT += dt;
    const blink = b.blinkT < 0.14 ? 1 - Math.sin((b.blinkT / 0.14) * Math.PI) : 1;
    if (t > b.flickAt) {
      b.flickT = 0;
      b.flickSide = Math.random() < 0.5 ? 1 : -1;
      b.flickAt = t + rand(2.5, 7);
    }
    b.flickT += dt;
    const flick = b.flickT < 0.3 ? Math.sin((b.flickT / 0.3) * Math.PI) * 0.6 : 0;

    // ---- damp animated values
    const fast = 16;
    a.hop = damp(a.hop, po.hop, 22, dt);
    a.squash = damp(a.squash, po.squash, 22, dt);
    a.roll = damp(a.roll, po.roll, 18, dt);
    a.lie = damp(a.lie, po.lie, 3, dt);
    a.headDown = damp(a.headDown, po.headDown, 7, dt);
    a.spin = po.spin === 0 && a.spin > Math.PI ? damp(a.spin, Math.PI * 2, 10, dt) : damp(a.spin, po.spin, 20, dt);
    if (po.spin === 0 && Math.abs(a.spin - Math.PI * 2) < 0.01) a.spin = 0;
    a.lunge = damp(a.lunge, po.lunge, 20, dt);
    a.open = damp(a.open, ex.open, fast, dt);
    a.blush = damp(a.blush, ex.blush, 5, dt);
    a.lid = damp(a.lid, ex.lid, 10, dt);
    a.earDroop = damp(a.earDroop, ex.earDroop, 6, dt);
    a.tail = damp(a.tail, ex.tail, 3, dt);
    a.cheekPuff = damp(a.cheekPuff, ex.cheekPuff, 12, dt);
    a.red = damp(a.red, ex.red, 6, dt);
    a.scale = damp(a.scale, stage.scale, 2.5, dt);
    a.head = damp(a.head, stage.head, 2.5, dt);
    a.cloud = damp(a.cloud, b.act?.kind === "rinse" ? 1 : 0, 6, dt);
    b.sickAmt = damp(b.sickAmt, g.sick ? 1 : 0, 2, dt);
    b.levelPulse = damp(b.levelPulse, 0, 2, dt);
    pet.scale = a.scale;
    pet.eating = b.act?.kind === "eat";
    pet.busy = !!b.act;
    pet.lying = a.lie;

    // ---- head look
    let yawT = 0;
    let pitchT = 0;
    if (look) {
      tmpC.copy(look).sub(pet.pos);
      const c = Math.cos(-pet.heading);
      const s = Math.sin(-pet.heading);
      const lx = tmpC.x * c + tmpC.z * s;
      const lz = -tmpC.x * s + tmpC.z * c;
      const ly = tmpC.y - 1.15 * a.scale;
      const hz = lz - 0.45 * a.scale;
      yawT = Math.max(-1, Math.min(1, Math.atan2(lx, Math.max(0.05, hz))));
      if (hz < 0) yawT = Math.sign(lx || 1) * 1;
      pitchT = Math.max(-0.55, Math.min(0.6, Math.atan2(-ly, Math.hypot(lx, hz))));
    }
    b.headYaw = damp(b.headYaw, yawT + po.yaw, 7, dt);
    b.headPitch = damp(b.headPitch, pitchT + po.pitch, 7, dt);
    a.headRoll = damp(a.headRoll, po.headRoll, 8, dt);

    // ---- apply transforms
    const spawnK = clamp01((t - b.spawnT) / 0.7);
    const pop = b.spawnT > 0 && spawnK < 1 ? Math.max(0.01, easeOutBack(spawnK)) : 1;
    root.position.set(pet.pos.x, 0, pet.pos.z);
    root.rotation.y = pet.heading;
    const S = a.scale * pop * (1 + b.levelPulse * 0.12 * Math.sin(t * 20));
    rig.scaler.scale.setScalar(S);

    const breath = g.asleep ? Math.sin(t * 1.4) * 0.03 : Math.sin(t * 2.4) * 0.012;
    const bob = Math.abs(Math.sin(b.walkPhase)) * 0.06 * walkAmt;
    const lie = a.lie;
    const rigNode = rig.bodyRig;
    rigNode.position.set(0, a.hop + bob - lie * 0.24, a.lunge);
    rigNode.rotation.set(-a.headDown * 0.12 + lie * 0.04, a.spin, a.roll + Math.sin(b.walkPhase) * 0.05 * walkAmt);
    rigNode.scale.set(1 + a.squash * 0.5, 1 - a.squash + breath, 1 + a.squash * 0.5);

    const legSwing = 0.65 * walkAmt;
    const legs = ["legFL", "legFR", "legBL", "legBR"];
    legs.forEach((k, i) => {
      const leg = rig[k];
      if (!leg) return;
      const phase = i === 0 || i === 3 ? 0 : Math.PI;
      const front = i < 2;
      const tuck = front ? -1.35 : 1.35;
      leg.rotation.x = Math.sin(b.walkPhase + phase) * legSwing * (1 - lie) + tuck * lie + (a.hop > 0.05 ? (front ? -0.3 : 0.3) * clamp01(a.hop * 3) : 0);
      leg.rotation.z = (i % 2 === 0 ? 1 : -1) * lie * 0.2;
    });

    const hp = rig.headPivot;
    hp.rotation.set(b.headPitch + a.headDown * 0.75 + lie * 0.38, b.headYaw, a.headRoll + (g.asleep ? Math.sin(t * 0.7) * 0.03 : 0));
    hp.position.set(0, 0.98 - a.headDown * 0.18 - lie * 0.05, 0.4 + a.headDown * 0.05);
    rig.headScale.scale.setScalar(a.head);

    const tail = rig.tail;
    tail.rotation.set(0.6 + Math.sin(t * 1.3) * 0.08, 0, Math.sin(t * 3 * a.tail) * (0.35 + a.tail * 0.1));

    const droop = a.earDroop * 0.55;
    rig.earL.rotation.set(0, 0, 0.3 + droop + (b.flickSide > 0 ? flick : 0));
    rig.earR.rotation.set(0, 0, -0.3 - droop - (b.flickSide < 0 ? flick : 0));

    // eyes
    for (const side of ["L", "R"]) {
      const open = rig[`eyeOpen${side}`];
      open.visible = ex.eyes === "open";
      open.scale.set(1 + (a.lid - 1) * 0.3, Math.max(0.05, a.lid * blink), 1);
      rig[`eyeHappy${side}`].visible = ex.eyes === "happy";
      rig[`eyeClosed${side}`].visible = ex.eyes === "closed";
      rig[`eyeSquint${side}`].visible = ex.eyes === "squint";
      const brow = rig[`brow${side}`];
      const sd = side === "L" ? -1 : 1;
      brow.visible = ex.brows !== "none";
      const tilt = ex.brows === "sad" ? 0.35 : ex.brows === "angry" ? -0.4 : 0;
      brow.rotation.z = Math.PI / 2 + sd * tilt;
      brow.position.y = ex.brows === "raised" ? 0.19 : 0.15;
    }

    const showOpen = a.open > 0.06 || ex.tongue;
    rig.mouthOpen.visible = showOpen;
    rig.mouthOpen.scale.set(1 + a.open * 0.2, Math.max(0.15, a.open), 1);
    rig.mouthSmile.visible = !showOpen && ex.mouth === "smile";
    rig.mouthFrown.visible = !showOpen && ex.mouth === "frown";
    rig.mouthFlat.visible = !showOpen && ex.mouth === "flat";
    rig.tongue.visible = ex.tongue;

    for (const side of ["L", "R"]) {
      const ch = rig[`cheek${side}`];
      ch.scale.set(0.075 * (1 + a.cheekPuff * 0.35), 0.05 * (1 + a.cheekPuff * 0.35), 0.02 + a.cheekPuff * 0.03);
    }
    m.cheek.opacity = Math.min(1, 0.15 + a.blush * 0.6 + a.red * 0.4);
    m.cheek.color.set(a.red > 0.3 ? "#ff5a6e" : "#ff8fb0");
    m.headFur.emissive.setRGB(a.red * 0.5, a.red * 0.05, a.red * 0.05);
    const sickCol = tmpC.set(1, 0.98, 0.953).lerp(tmpB.set(0.86, 0.94, 0.8), b.sickAmt);
    m.fur.color.setRGB(sickCol.x, sickCol.y, sickCol.z);
    m.headFur.color.setRGB(sickCol.x, sickCol.y, sickCol.z);

    // horns grow with stage
    const hornS = stageIndexFor(g.level) >= 1 ? (stageIndexFor(g.level) >= 2 ? 1 : 0.7) : 0.001;
    rig.hornL.scale.setScalar(damp(rig.hornL.scale.x, hornS, 3, dt));
    rig.hornR.scale.copy(rig.hornL.scale);

    // dirt & flies
    mudRefs.current.forEach((mud, i) => {
      if (!mud) return;
      const target = hygiene < MUD_THRESH[i] ? 1 : 0.001;
      mud.scale.setScalar(damp(mud.scale.x, target, 5, dt));
      mud.visible = mud.scale.x > 0.01;
    });
    const flies = rig.flies;
    const fliesOn = hygiene < 25 && !g.asleep ? 1 : 0.001;
    flies.scale.setScalar(damp(flies.scale.x, fliesOn, 3, dt));
    flies.visible = flies.scale.x > 0.01;
    if (flies.visible) {
      flies.children.forEach((f, i) => {
        const k = t * (2.2 + i * 0.7) + i * 2;
        f.position.set(Math.cos(k) * 0.7, 1.35 + Math.sin(k * 2.3) * 0.15, Math.sin(k) * 0.6);
        f.children[1].rotation.z = Math.sin(t * 60) * 0.8;
      });
    }

    rig.cloud.scale.setScalar(Math.max(0.001, a.cloud));
    rig.cloud.visible = a.cloud > 0.01;
    rig.cloud.rotation.y = -pet.heading + t * 0.3;

    // anchors
    rig.headCenter.getWorldPosition(pet.head);
    rig.mouthAnchor.getWorldPosition(pet.mouth);

    rig.bubble.position.set(0, (2.05 - lie * 0.4 + a.hop) * S, 0);
    if (bubble.el) {
      rig.bubble.getWorldPosition(bubbleV).project(state.camera);
      const bx = ((bubbleV.x + 1) / 2) * state.size.width;
      const by = ((1 - bubbleV.y) / 2) * state.size.height;
      bubble.el.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;
      bubble.el.style.visibility = bubbleV.z < 1 ? "visible" : "hidden";
    }
    const sh = rig.shadow as Mesh;
    sh.scale.setScalar(1.7 * S * (1 - clamp01(a.hop) * 0.45));
    (sh.material as MeshBasicMaterial).opacity = 1 - env.night * 0.4;
  });

  return (
    <group ref={bind("root")} visible={hatched}>
      <mesh ref={bind("shadow")} material={m.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={1}>
        <planeGeometry args={[1, 1.2]} />
      </mesh>
      <group ref={bind("bubble")} />
      <group ref={bind("scaler")}>
        {hatched && <mesh
          position={[0, 0.82, 0.12]}
          scale={[0.74, 0.8, 1.08]}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerOver={() => {
            brain.hover = true;
            document.body.dataset.hover = "pet";
          }}
          onPointerOut={() => {
            brain.hover = false;
            delete document.body.dataset.hover;
          }}
        >
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>}

        <group ref={bind("bodyRig")}>
          <mesh material={m.fur} position={[0, 0.62, -0.05]} scale={[0.58, 0.5, 0.68]} castShadow receiveShadow>
            <sphereGeometry args={[1, 40, 30]} />
            {BODY_SPOTS.map((s, i) => (
              <Patch key={i} dir={s.dir} size={s.size} material={m.spot} />
            ))}
            {MUD.filter((d) => !d.head).map((d, i) => (
              <Patch key={i} dir={d.dir} size={d.size} material={m.mud} depth={0.91} groupRef={(o) => void (mudRefs.current[i] = o)} />
            ))}
            <mesh position={[0, -0.72, 0.2]} scale={[0.55, 0.3, 0.6]} material={m.muzzle}>
              <sphereGeometry args={[1, 20, 14]} />
            </mesh>
          </mesh>

          {[
            ["legFL", 0.27, 0.42, 0.3],
            ["legFR", -0.27, 0.42, 0.3],
            ["legBL", 0.27, 0.42, -0.38],
            ["legBR", -0.27, 0.42, -0.38],
          ].map(([k, x, y, z]) => (
            <group key={k as string} ref={bind(k as string)} position={[x as number, y as number, z as number]}>
              <mesh material={m.fur} position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.11, 0.16, 8, 16]} />
              </mesh>
              <mesh material={m.hoof} position={[0, -0.36, 0.005]} castShadow>
                <cylinderGeometry args={[0.108, 0.118, 0.08, 16]} />
              </mesh>
            </group>
          ))}

          <group ref={bind("tail")} position={[0, 0.8, -0.7]}>
            <mesh material={m.fur} position={[0, -0.17, 0]}>
              <capsuleGeometry args={[0.028, 0.3, 4, 8]} />
            </mesh>
            <mesh material={m.spot} position={[0, -0.36, 0]} scale={[0.065, 0.1, 0.065]}>
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
          </group>

          <NeckAccessory id={equipped.neck} m={m} />

          <group ref={bind("headPivot")} position={[0, 0.98, 0.4]}>
            <group ref={bind("headScale")}>
              <group ref={bind("headCenter")} position={[0, 0.2, 0.12]}>
                <mesh material={m.headFur} scale={[0.5, 0.45, 0.46]} castShadow>
                  <sphereGeometry args={[1, 40, 30]} />
                  <Patch dir={[-0.62, 0.5, 0.62]} size={[0.4, 0.34]} material={m.spot} />
                  <Patch dir={[0.55, 0.55, -0.62]} size={[0.38, 0.32]} material={m.spot} />
                  <Patch dir={MUD[5].dir} size={MUD[5].size} material={m.mud} depth={0.91} groupRef={(o) => void (mudRefs.current[5] = o)} />
                </mesh>

                {[-0.5, 0, 0.5].map((r, i) => (
                  <mesh key={i} material={m.spot} position={[r * 0.08, 0.44, 0.06 + (i === 1 ? 0.02 : 0)]} rotation={[0.3, 0, -r]} scale={[0.045, 0.1, 0.045]}>
                    <sphereGeometry args={[1, 10, 8]} />
                  </mesh>
                ))}

                <mesh material={m.muzzle} position={[0, -0.15, 0.33]} scale={[0.34, 0.24, 0.22]} castShadow>
                  <sphereGeometry args={[1, 28, 20]} />
                </mesh>
                {[-1, 1].map((sd) => (
                  <mesh key={sd} material={m.nostril} position={[sd * 0.1, -0.1, 0.527]} rotation={[0, sd * 0.35, 0]} scale={[0.028, 0.04, 0.02]}>
                    <sphereGeometry args={[1, 10, 8]} />
                  </mesh>
                ))}

                <group ref={bind("mouthAnchor")} position={[0, -0.27, 0.62]} />
                <mesh ref={bind("mouthSmile")} material={m.line} position={[0, -0.235, 0.52]} rotation={[0.35, 0, Math.PI]}>
                  <torusGeometry args={[0.05, 0.011, 8, 16, Math.PI]} />
                </mesh>
                <mesh ref={bind("mouthFrown")} material={m.line} position={[0, -0.3, 0.505]} rotation={[0.35, 0, 0]}>
                  <torusGeometry args={[0.045, 0.011, 8, 16, Math.PI]} />
                </mesh>
                <mesh ref={bind("mouthFlat")} material={m.line} position={[0, -0.27, 0.515]} rotation={[0, 0, Math.PI / 2]}>
                  <capsuleGeometry args={[0.011, 0.06, 4, 8]} />
                </mesh>
                <group ref={bind("mouthOpen")} position={[0, -0.27, 0.495]} rotation={[0.35, 0, 0]}>
                  <mesh material={m.mouthIn} scale={[0.075, 0.075, 0.045]}>
                    <sphereGeometry args={[1, 16, 12]} />
                  </mesh>
                  <mesh material={m.tongue} position={[0, -0.04, 0.018]} scale={[0.05, 0.028, 0.03]}>
                    <sphereGeometry args={[1, 12, 10]} />
                  </mesh>
                </group>
                <mesh ref={bind("tongue")} material={m.tongue} position={[0.02, -0.34, 0.52]} rotation={[-0.4, 0, 0.15]}>
                  <capsuleGeometry args={[0.032, 0.06, 6, 10]} />
                </mesh>

                {(["L", "R"] as const).map((side) => {
                  const sd = side === "L" ? -1 : 1;
                  return (
                    <group key={side} position={[sd * 0.19, 0.04, 0.41]} rotation={[0, sd * 0.38, 0]}>
                      <group ref={bind(`eyeOpen${side}`)}>
                        <mesh material={m.eye} scale={[0.072, 0.098, 0.04]}>
                          <sphereGeometry args={[1, 20, 16]} />
                        </mesh>
                        <mesh material={m.white} position={[0.022, 0.035, 0.034]} scale={0.024}>
                          <sphereGeometry args={[1, 10, 8]} />
                        </mesh>
                        <mesh material={m.white} position={[-0.02, -0.032, 0.035]} scale={0.012}>
                          <sphereGeometry args={[1, 8, 6]} />
                        </mesh>
                      </group>
                      <mesh ref={bind(`eyeHappy${side}`)} material={m.line} position={[0, -0.02, 0.03]}>
                        <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI]} />
                      </mesh>
                      <mesh ref={bind(`eyeClosed${side}`)} material={m.line} position={[0, 0.02, 0.03]} rotation={[0, 0, Math.PI]}>
                        <torusGeometry args={[0.045, 0.014, 8, 16, Math.PI]} />
                      </mesh>
                      <group ref={bind(`eyeSquint${side}`)} position={[0, 0, 0.03]} scale={[sd, 1, 1]}>
                        <mesh material={m.line} position={[0, 0.019, 0]} rotation={[0, 0, Math.PI / 2 + 0.55]}>
                          <capsuleGeometry args={[0.013, 0.045, 4, 8]} />
                        </mesh>
                        <mesh material={m.line} position={[0, -0.019, 0]} rotation={[0, 0, Math.PI / 2 - 0.55]}>
                          <capsuleGeometry args={[0.013, 0.045, 4, 8]} />
                        </mesh>
                      </group>
                      <mesh ref={bind(`brow${side}`)} material={m.line} position={[0, 0.15, -0.02]} rotation={[0, 0, Math.PI / 2]}>
                        <capsuleGeometry args={[0.012, 0.06, 4, 8]} />
                      </mesh>
                    </group>
                  );
                })}

                {(["L", "R"] as const).map((side) => {
                  const sd = side === "L" ? -1 : 1;
                  return (
                    <mesh key={side} ref={bind(`cheek${side}`)} material={m.cheek} position={[sd * 0.31, -0.1, 0.33]} rotation={[0, sd * 0.65, 0]} renderOrder={2}>
                      <sphereGeometry args={[1, 16, 10]} />
                    </mesh>
                  );
                })}

                {(["L", "R"] as const).map((side) => {
                  const sd = side === "L" ? -1 : 1;
                  return (
                    <group key={side} ref={bind(`ear${side}`)} position={[sd * 0.43, 0.12, 0.0]}>
                      <mesh material={m.headFur} position={[sd * 0.15, 0, 0]} scale={[0.19, 0.075, 0.11]} castShadow>
                        <sphereGeometry args={[1, 16, 12]} />
                      </mesh>
                      <mesh material={m.earInner} position={[sd * 0.16, 0, 0.045]} scale={[0.13, 0.045, 0.07]}>
                        <sphereGeometry args={[1, 14, 10]} />
                      </mesh>
                    </group>
                  );
                })}

                {(["L", "R"] as const).map((side) => {
                  const sd = side === "L" ? -1 : 1;
                  return (
                    <group key={side} ref={bind(`horn${side}`)} position={[sd * 0.22, 0.35, -0.03]} rotation={[-0.1, 0, -sd * 0.5]}>
                      <mesh material={m.horn} position={[0, 0.08, 0]} castShadow>
                        <coneGeometry args={[0.055, 0.19, 12]} />
                      </mesh>
                    </group>
                  );
                })}

                <Accessory id={equipped.head} m={m} />
                <FaceAccessory id={equipped.face} m={m} />
              </group>
            </group>
          </group>
        </group>

        <group ref={bind("flies")}>
          {[0, 1].map((i) => (
            <group key={i}>
              <mesh material={m.fly} scale={0.03}>
                <sphereGeometry args={[1, 8, 6]} />
              </mesh>
              <mesh material={m.wing} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.02, 1]}>
                <circleGeometry args={[1, 8]} />
              </mesh>
            </group>
          ))}
        </group>

        <group ref={bind("cloud")} position={[0, 2.35, 0.25]}>
          {[
            [0, 0, 0, 0.32],
            [0.3, -0.05, 0, 0.25],
            [-0.3, -0.04, 0.05, 0.26],
            [0.1, 0.12, -0.05, 0.24],
          ].map(([x, y, z, s], i) => (
            <mesh key={i} material={m.cloud} position={[x, y, z]} scale={s}>
              <sphereGeometry args={[1, 14, 10]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
