import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  AmbientLight,
} from "three";
import { useThree } from "@react-three/fiber";
import { env, mulberry32 } from "../game/runtime";
import { useGame } from "../game/store";
import { radialTexture } from "./shapes";

interface Key {
  h: number;
  zenith: string;
  horizon: string;
  below: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  night: number;
}

const KEYS: Key[] = [
  { h: 0, zenith: "#0d1440", horizon: "#2a3275", below: "#171d52", sun: "#8ea2ff", sunI: 0.55, hemiSky: "#5a66b8", hemiGround: "#262c5c", hemiI: 0.7, night: 1 },
  { h: 5, zenith: "#1b2462", horizon: "#4b4d93", below: "#232a66", sun: "#9aa6ff", sunI: 0.6, hemiSky: "#6a70c0", hemiGround: "#2e3268", hemiI: 0.75, night: 0.9 },
  { h: 6.3, zenith: "#5a7fd0", horizon: "#ffb8a8", below: "#8fa4dd", sun: "#ffc59a", sunI: 1.6, hemiSky: "#ffd2c2", hemiGround: "#8a7ab0", hemiI: 1.0, night: 0.25 },
  { h: 8, zenith: "#5fb2ff", horizon: "#d9f0ff", below: "#a8d6ff", sun: "#fff1dc", sunI: 2.6, hemiSky: "#cfe9ff", hemiGround: "#b9a98f", hemiI: 1.2, night: 0 },
  { h: 13, zenith: "#4aa6ff", horizon: "#d4efff", below: "#9fd2ff", sun: "#ffffff", sunI: 2.9, hemiSky: "#d8eeff", hemiGround: "#b5a88f", hemiI: 1.25, night: 0 },
  { h: 17, zenith: "#5aa2f0", horizon: "#ffe3c4", below: "#a9cff5", sun: "#ffe2b8", sunI: 2.5, hemiSky: "#ffe8d0", hemiGround: "#b09a88", hemiI: 1.15, night: 0 },
  { h: 18.8, zenith: "#4c4fa8", horizon: "#ff9f8f", below: "#8f86c9", sun: "#ffa77a", sunI: 1.7, hemiSky: "#ffc0b0", hemiGround: "#7c6a9c", hemiI: 1.0, night: 0.3 },
  { h: 20.3, zenith: "#141b4d", horizon: "#343a82", below: "#1d235a", sun: "#8ea2ff", sunI: 0.6, hemiSky: "#5c68b8", hemiGround: "#282e60", hemiI: 0.72, night: 0.95 },
  { h: 24, zenith: "#0d1440", horizon: "#2a3275", below: "#171d52", sun: "#8ea2ff", sunI: 0.55, hemiSky: "#5a66b8", hemiGround: "#262c5c", hemiI: 0.7, night: 1 },
];

const SLEEP: Key = { h: 0, zenith: "#0b1033", horizon: "#262c6c", below: "#141a48", sun: "#8c9cff", sunI: 0.45, hemiSky: "#4f5aa8", hemiGround: "#20264f", hemiI: 0.6, night: 1 };

interface State {
  zenith: Color;
  horizon: Color;
  below: Color;
  sun: Color;
  sunI: number;
  hemiSky: Color;
  hemiGround: Color;
  hemiI: number;
  night: number;
}

const toState = (k: Key): State => ({
  zenith: new Color(k.zenith),
  horizon: new Color(k.horizon),
  below: new Color(k.below),
  sun: new Color(k.sun),
  sunI: k.sunI,
  hemiSky: new Color(k.hemiSky),
  hemiGround: new Color(k.hemiGround),
  hemiI: k.hemiI,
  night: k.night,
});

const KEY_STATES = KEYS.map(toState);
const SLEEP_STATE = toState(SLEEP);

function lerpState(out: State, a: State, b: State, t: number) {
  out.zenith.copy(a.zenith).lerp(b.zenith, t);
  out.horizon.copy(a.horizon).lerp(b.horizon, t);
  out.below.copy(a.below).lerp(b.below, t);
  out.sun.copy(a.sun).lerp(b.sun, t);
  out.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
  out.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);
  out.sunI = a.sunI + (b.sunI - a.sunI) * t;
  out.hemiI = a.hemiI + (b.hemiI - a.hemiI) * t;
  out.night = a.night + (b.night - a.night) * t;
  return out;
}

function sampleHour(out: State, hour: number) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (hour >= KEYS[i].h && hour <= KEYS[i + 1].h) {
      const t = (hour - KEYS[i].h) / (KEYS[i + 1].h - KEYS[i].h);
      const s = t * t * (3 - 2 * t);
      return lerpState(out, KEY_STATES[i], KEY_STATES[i + 1], s);
    }
  }
  return lerpState(out, KEY_STATES[0], KEY_STATES[0], 0);
}

export function currentHour() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const skyFrag = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 below;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 c = h > 0.0 ? mix(horizon, zenith, pow(smoothstep(0.0, 0.75, h), 0.8)) : mix(horizon, below, smoothstep(0.0, -0.35, h));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function Cloud({ seed, scale }: { seed: number; scale: number }) {
  const puffs = useMemo(() => {
    const r = mulberry32(seed);
    const n = 4 + Math.floor(r() * 3);
    return Array.from({ length: n }, (_, i) => {
      const x = (i - (n - 1) / 2) * 0.62 + (r() - 0.5) * 0.2;
      const s = 0.55 + r() * 0.45 * (1 - Math.abs(x) / 2);
      return { x, y: (r() - 0.3) * 0.25, z: (r() - 0.5) * 0.4, s };
    });
  }, [seed]);
  return (
    <group scale={scale}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.8, p.s]} material={cloudMat}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      ))}
    </group>
  );
}

const cloudMat = new MeshStandardMaterial({ color: "#ffffff", roughness: 1, emissive: "#ffffff", emissiveIntensity: 0.25 });

export function SkyAndLights() {
  const asleep = useGame((s) => s.asleep);
  const cur = useMemo(() => sampleHour(toState(KEYS[0]), currentHour()), []);
  const target = useMemo(() => toState(KEYS[0]), []);
  const scene = useThree((s) => s.scene);

  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: BackSide,
        depthWrite: false,
        uniforms: { zenith: { value: new Color() }, horizon: { value: new Color() }, below: { value: new Color() } },
      }),
    [],
  );

  const stars = useMemo(() => {
    const r = mulberry32(7);
    const n = 520;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2;
      const y = 0.05 + r() * 0.95;
      const rr = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(th) * rr * 70;
      pos[i * 3 + 1] = y * 70;
      pos[i * 3 + 2] = Math.sin(th) * rr * 70;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, []);
  const starMat = useMemo(
    () => new PointsMaterial({ color: "#ffffff", size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    [],
  );

  const glowTex = useMemo(() => radialTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)"), []);
  const sunRef = useRef<Group>(null!);
  const moonRef = useRef<Group>(null!);
  const sunGlow = useRef<Sprite>(null!);
  const moonGlow = useRef<Sprite>(null!);
  const dir = useRef<DirectionalLight>(null!);
  const hemi = useRef<HemisphereLight>(null!);
  const amb = useRef<AmbientLight>(null!);
  const starsRef = useRef<Points>(null!);
  const clouds = useRef<Group>(null!);
  const fog = useMemo(() => new Fog("#cfe8ff", 30, 95), []);

  const cloudDefs = useMemo(() => {
    const r = mulberry32(42);
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + r() * 0.4;
      const low = i % 3 === 0;
      const rad = low ? 7 + r() * 5 : 13 + r() * 12;
      return { a, rad, y: low ? -4 - r() * 3 : -1 + r() * 9, s: low ? 1.3 + r() : 1 + r() * 1.6, seed: i * 13 + 5, speed: 0.004 + r() * 0.006 };
    });
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const hour = currentHour();
    sampleHour(target, hour);
    if (asleep) lerpState(target, target, SLEEP_STATE, 0.9);
    const k = 1 - Math.exp(-dt * 1.6);
    lerpState(cur, cur, target, k);
    env.night = cur.night;

    skyMat.uniforms.zenith.value.copy(cur.zenith);
    skyMat.uniforms.horizon.value.copy(cur.horizon);
    skyMat.uniforms.below.value.copy(cur.below);
    fog.color.copy(cur.horizon).lerp(cur.below, 0.35);
    if (scene.fog !== fog) scene.fog = fog;

    hemi.current.color.copy(cur.hemiSky);
    hemi.current.groundColor.copy(cur.hemiGround);
    hemi.current.intensity = cur.hemiI;
    dir.current.color.copy(cur.sun);
    dir.current.intensity = cur.sunI;
    amb.current.intensity = 0.25 + cur.night * 0.15;

    const sunA = ((hour - 6) / 12) * Math.PI;
    const sunVis = asleep ? 0 : 1 - cur.night;
    sunRef.current.position.set(Math.cos(sunA) * -40, Math.sin(sunA) * 30 + 6, -38);
    sunRef.current.visible = sunVis > 0.02 && Math.sin(sunA) > -0.15;
    (sunGlow.current.material as SpriteMaterial).opacity = 0.7 * sunVis;
    const moonA = sunA + Math.PI;
    const moonH = asleep ? 0.9 : Math.sin(moonA);
    moonRef.current.position.set(asleep ? 18 : Math.cos(moonA) * -40, moonH * 26 + 8, -40);
    moonRef.current.visible = cur.night > 0.05;
    const moonMat = (moonRef.current.children[0] as Mesh).material as MeshBasicMaterial;
    moonMat.opacity = cur.night;
    (moonGlow.current.material as SpriteMaterial).opacity = 0.35 * cur.night;

    starMat.opacity = Math.max(0, cur.night - 0.2) * 1.2;
    starsRef.current.rotation.y += dt * 0.004;

    cloudMat.color.setRGB(1, 1, 1).lerp(cur.hemiSky, 0.25 + cur.night * 0.5).multiplyScalar(1 - cur.night * 0.45);
    cloudMat.emissive.copy(cur.horizon);
    cloudMat.emissiveIntensity = 0.18 + cur.night * 0.1;

    const t = state.clock.elapsedTime;
    clouds.current.children.forEach((c, i) => {
      const d = cloudDefs[i];
      const a = d.a + t * d.speed;
      c.position.set(Math.cos(a) * d.rad, d.y + Math.sin(t * 0.2 + i) * 0.15, Math.sin(a) * d.rad);
      c.lookAt(0, c.position.y, 0);
    });
  });

  return (
    <>
      <mesh material={skyMat} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[90, 32, 16]} />
      </mesh>
      <points ref={starsRef} geometry={stars} material={starMat} />
      <group ref={sunRef}>
        <mesh>
          <sphereGeometry args={[2.4, 24, 16]} />
          <meshBasicMaterial color="#fff6d5" toneMapped={false} fog={false} />
        </mesh>
        <sprite ref={sunGlow} scale={16}>
          <spriteMaterial map={glowTex} color="#fff0b8" transparent blending={AdditiveBlending} depthWrite={false} fog={false} />
        </sprite>
      </group>
      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[1.8, 24, 16]} />
          <meshBasicMaterial color="#f6f2ff" toneMapped={false} transparent fog={false} />
        </mesh>
        <mesh position={[0.6, 0.35, 1.1]}>
          <sphereGeometry args={[0.35, 12, 10]} />
          <meshBasicMaterial color="#dcd6f2" toneMapped={false} fog={false} />
        </mesh>
        <mesh position={[-0.5, -0.45, 1.25]}>
          <sphereGeometry args={[0.25, 12, 10]} />
          <meshBasicMaterial color="#dcd6f2" toneMapped={false} fog={false} />
        </mesh>
        <sprite ref={moonGlow} scale={12}>
          <spriteMaterial map={glowTex} color="#b9c2ff" transparent blending={AdditiveBlending} depthWrite={false} fog={false} />
        </sprite>
      </group>
      <group ref={clouds}>
        {cloudDefs.map((d) => (
          <Cloud key={d.seed} seed={d.seed} scale={d.s} />
        ))}
      </group>
      <hemisphereLight ref={hemi} />
      <ambientLight ref={amb} />
      <directionalLight
        ref={dir}
        position={[5, 10, 6]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
    </>
  );
}
