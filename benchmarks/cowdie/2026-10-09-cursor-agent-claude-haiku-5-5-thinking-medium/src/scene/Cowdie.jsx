import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { emit, on } from '../game/events.js';
import { FOODS } from '../game/foods.js';
import { FoodModel } from './FoodModel.jsx';
import { spawnParticles } from './particles.jsx';
import { BALL_REST, BALL_TARGET, FOOD_SLOTS } from './layout.js';

const PI = Math.PI;
const FLY = 0.6; // seconds for food to travel from the table to the mouth
const Z = new THREE.Vector3(0, 0, 1);
const WHITE = '#fff7ec';

const BODY_PATCHES = [
  { dir: [0.7, 0.5, 0.5], s: 0.34 },
  { dir: [-0.6, 0.65, 0.45], s: 0.28 },
  { dir: [-0.35, -0.2, 0.9], s: 0.3 },
  { dir: [0.95, -0.1, -0.2], s: 0.32 },
  { dir: [-0.9, -0.35, -0.2], s: 0.25 },
];
const DIRT = [
  { dir: [0.4, -0.5, 0.7], s: 0.22 },
  { dir: [-0.7, -0.3, 0.4], s: 0.18 },
  { dir: [0.2, 0.6, 0.8], s: 0.16 },
  { dir: [-0.1, -0.9, 0.3], s: 0.2 },
];

// Places children on the surface of a sphere, facing outward.
function Surface({ center, radius, dir, children, ...rest }) {
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(Z, d);
  const pos = [center[0] + d.x * radius, center[1] + d.y * radius, center[2] + d.z * radius];
  return (
    <group position={pos} quaternion={q} {...rest}>
      {children}
    </group>
  );
}

function startHop(s, height, dur) {
  s.hopH = height;
  s.hopDur = dur;
  s.hopT = dur;
}

function startFeed(s, id) {
  const food = FOODS[id];
  const drink = food.kind === 'drink';
  const n = food.bites;
  const step = drink ? 0.7 : 0.42;
  const start = FLY + 0.15;
  const times = Array.from({ length: n }, (_, i) => start + i * step);
  s.feed = {
    id,
    drink,
    n,
    times,
    next: 0,
    clock: 0,
    end: times[n - 1] + 0.9,
    from: new THREE.Vector3(...FOOD_SLOTS[id]),
    scale: 1,
  };
}

function bite(s, i, mouthW) {
  const f = s.feed;
  const food = FOODS[f.id];
  s.chew = 0.3;
  s.squash = 1;
  s.belly = Math.min(1.2, s.belly + (food.fullness / 100) * 1.1);
  if (f.drink) {
    spawnParticles('bubble', mouthW, 5, { color: '#ffffff', size: 0.8, spread: 0.6 });
  } else {
    f.scale = Math.max(0.3, 1 - ((i + 1) / f.n) * 0.75);
    spawnParticles('crumb', mouthW, 8, { color: food.color, size: 0.9 });
  }
  if (i === f.n - 1) {
    s.happyT = 1.2;
    startHop(s, 0.7, 0.6);
  }
}

export function Cowdie({ mood, sleeping, cleanliness, onPet }) {
  const root = useRef();
  const body = useRef();
  const head = useRef();
  const eyeL = useRef();
  const eyeR = useRef();
  const smile = useRef();
  const frown = useRef();
  const open = useRef();
  const tail = useRef();
  const mouth = useRef();
  const top = useRef();
  const shadow = useRef();
  const carry = useRef();
  const kids = useRef({});
  const ball = useRef();
  const dirtMats = useRef([]);

  const S = useRef({
    t: 0,
    hopT: 0,
    hopDur: 1,
    hopH: 0,
    wiggle: 0,
    blinkIn: 2,
    blinking: 0,
    eyeOpen: 1,
    mouthOpen: 0,
    sleepAmt: 0,
    squash: 0,
    chew: 0,
    belly: 0,
    headYaw: 0,
    happyT: 0,
    zzz: 0,
    feed: null,
    play: null,
    wash: null,
    washAcc: 0,
  });

  // Hearts, stars, feeding etc. are triggered by game events, not by React renders.
  useEffect(() => {
    const worldTop = () => top.current.getWorldPosition(new THREE.Vector3());
    const offs = [
      on('feed', ({ id }) => {
        if (FOODS[id]) startFeed(S.current, id);
      }),
      on('play', () => {
        S.current.play = { clock: 0, hopped: false };
      }),
      on('wash', () => {
        S.current.wash = { clock: 0, done: false };
        S.current.washAcc = 0;
      }),
      on('pet', () => {
        const s = S.current;
        s.wiggle = 0.6;
        startHop(s, 0.4, 0.4);
        spawnParticles('heart', worldTop(), 3, { size: 1, spread: 1.2 });
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = S.current;
    s.t += dt;
    const sleep = sleeping ? 1 : 0;
    s.sleepAmt += (sleep - s.sleepAmt) * Math.min(1, dt * 2.5);

    const mouthW = mouth.current.getWorldPosition(new THREE.Vector3());

    // --- Hop ---
    if (s.hopT > 0) s.hopT = Math.max(0, s.hopT - dt);
    const hopY = s.hopT > 0 ? Math.sin((1 - s.hopT / s.hopDur) * PI) * s.hopH : 0;

    // --- Wiggle / wash shake ---
    s.wiggle = Math.max(0, s.wiggle - dt);
    let wig = s.wiggle > 0 ? Math.sin(s.wiggle * 26) * 0.1 * Math.min(1, s.wiggle * 2) : 0;

    // --- Blink ---
    s.blinkIn -= dt;
    if (s.blinkIn <= 0) {
      s.blinking = 0.14;
      s.blinkIn = 2.2 + Math.random() * 3;
    }
    if (s.blinking > 0) s.blinking -= dt;
    if (s.happyT > 0) s.happyT = Math.max(0, s.happyT - dt);
    s.squash = Math.max(0, s.squash - dt * 6);
    s.chew = Math.max(0, s.chew - dt);
    s.belly = Math.max(0, s.belly - dt * 0.22);

    // --- Play with ball ---
    if (s.play) {
      const p = s.play;
      p.clock += dt;
      if (!p.hopped && p.clock >= 0.7) {
        p.hopped = true;
        startHop(s, 0.9, 0.6);
        s.happyT = 0.6;
        spawnParticles('star', mouthW, 6, { color: '#ffe066', spread: 1.8 });
      }
      if (p.clock >= 2.2) s.play = null;
    }

    if (ball.current) {
      const rest = BALL_REST;
      let x = rest[0], y = rest[1], z = rest[2];
      if (s.play) {
        const c = s.play.clock;
        if (c < 0.7) {
          const e = smooth(c / 0.7);
          x = lerp(rest[0], BALL_TARGET[0], e);
          y = lerp(rest[1], BALL_TARGET[1], e) + Math.sin(e * PI) * 1.0;
          z = lerp(rest[2], BALL_TARGET[2], e);
        } else {
          const e = smooth(Math.min(1, (c - 0.7) / 1.1));
          x = lerp(BALL_TARGET[0], rest[0], e);
          y = lerp(BALL_TARGET[1], rest[1], e) + Math.sin(e * PI) * 0.6;
          z = lerp(BALL_TARGET[2], rest[2], e);
        }
        ball.current.rotation.x += dt * 6;
      }
      ball.current.position.set(x, y, z);
    }

    // --- Wash ---
    if (s.wash) {
      const w = s.wash;
      w.clock += dt;
      if (w.clock < 2.0) {
        wig += Math.sin(w.clock * 18) * 0.12;
        s.washAcc += dt;
        while (s.washAcc > 0.08) {
          s.washAcc -= 0.08;
          const th = Math.random() * PI * 2;
          spawnParticles(
            'bubble',
            new THREE.Vector3(Math.cos(th) * 1.25, 0.6 + Math.random() * 1.9, Math.sin(th) * 1.25),
            1,
            { size: 1.4, lift: 0.4, spread: 0.25 },
          );
        }
      } else if (!w.done) {
        w.done = true;
        spawnParticles('star', new THREE.Vector3(0, 2.2, 0), 8, { color: '#9ff0ff', spread: 2.2, size: 1.2 });
      }
      if (w.clock >= 2.3) s.wash = null;
    }

    // --- Feeding timeline ---
    if (s.feed) {
      const f = s.feed;
      f.clock += dt;
      while (f.next < f.n && f.clock >= f.times[f.next]) {
        bite(s, f.next, mouthW);
        f.next++;
      }
      if (f.clock >= f.end) {
        s.feed = null;
        emit('feedDone');
      }
    }

    // --- Carried food follows the table -> mouth arc ---
    if (carry.current) {
      carry.current.visible = !!s.feed;
      if (s.feed) {
        const f = s.feed;
        const k = Math.min(1, f.clock / FLY);
        const e = smooth(k);
        carry.current.position.copy(f.from).lerp(mouthW, e);
        carry.current.position.y += Math.sin(e * PI) * 1.2;
        carry.current.scale.setScalar(lerp(carry.current.scale.x, f.scale, Math.min(1, dt * 12)));
        const drinkTilt = f.drink && f.clock >= FLY ? (s.chew > 0 ? -1.1 : -0.35) : 0;
        carry.current.rotation.z = lerp(carry.current.rotation.z, drinkTilt, Math.min(1, dt * 10));
      }
      for (const id of Object.keys(FOODS)) {
        if (kids.current[id]) kids.current[id].visible = s.feed?.id === id;
      }
    }

    // --- Idle / happy extras ---
    if (sleeping) {
      s.zzz -= dt;
      if (s.zzz <= 0) {
        s.zzz = 1.6;
        spawnParticles('star', new THREE.Vector3(0.7, 3.1, 0.2), 1, { color: '#c9d6ff', size: 2.2, spread: 0.3, lift: 0.6 });
      }
    } else {
      s.zzz = 0;
      if (mood === 'happy' && Math.random() < dt * 0.12) {
        spawnParticles('heart', new THREE.Vector3(0, 3.2, 0.3), 1, { size: 0.7, spread: 0.5 });
      }
    }

    // --- Root: hop + idle bob + wiggle ---
    if (root.current) {
      const bob = sleeping ? 0 : Math.sin(s.t * 2.4) * 0.025;
      root.current.position.y = hopY + bob;
      root.current.rotation.z = wig;
      root.current.rotation.x = s.sleepAmt * 0.06;
    }

    // --- Body: breathing + belly + squash ---
    if (body.current) {
      const breath = Math.sin(s.t * (sleeping ? 1.4 : 3.0)) * (sleeping ? 0.03 : 0.015);
      const sx = (1 + s.belly * 0.08 + breath) * (1 + s.squash * 0.03);
      const sy = (1 + s.belly * 0.04 + breath * 0.8) * (1 - s.squash * 0.06);
      body.current.scale.set(sx, sy, sx);
    }

    // --- Head: look toward cursor, or toward food while feeding ---
    if (head.current) {
      let yawT = state.pointer.x * 0.3;
      if (s.feed && carry.current) yawT = carry.current.position.x * 0.12;
      s.headYaw += (yawT - s.headYaw) * Math.min(1, dt * 6);
      const chewBob = s.chew > 0 ? Math.abs(Math.sin(s.chew * 60)) * 0.05 : 0;
      head.current.position.y = 2.2 + chewBob - s.sleepAmt * 0.12;
      head.current.rotation.y = s.headYaw * (1 - s.sleepAmt);
      head.current.rotation.x = -state.pointer.y * 0.08 * (1 - s.sleepAmt);
    }

    // --- Eyes: blink, sleep, tired, happy squint ---
    let eyeT = 1;
    if (mood === 'tired') eyeT = 0.55;
    if (s.happyT > 0) eyeT = 0.3;
    if (s.blinking > 0 && !sleeping) eyeT = 0.08;
    if (sleeping) eyeT = 0.08;
    s.eyeOpen += (eyeT - s.eyeOpen) * Math.min(1, dt * 16);
    if (eyeL.current) eyeL.current.scale.y = s.eyeOpen;
    if (eyeR.current) eyeR.current.scale.y = s.eyeOpen;

    // --- Mouth: chewing overrides mood ---
    const chewing = s.chew > 0;
    const openT = chewing ? 1 : mood === 'hungry' ? 0.45 : mood === 'tired' || sleeping ? 0.3 : 0;
    s.mouthOpen += (openT - s.mouthOpen) * Math.min(1, dt * 18);
    if (open.current) {
      open.current.visible = s.mouthOpen > 0.03;
      open.current.scale.set(1 + s.mouthOpen * 0.2, 0.2 + s.mouthOpen * 0.9, 1);
    }
    if (smile.current) smile.current.visible = mood === 'happy' && s.mouthOpen < 0.2;
    if (frown.current) frown.current.visible = (mood === 'sad' || mood === 'dirty') && !chewing;

    // --- Tail wag ---
    if (tail.current) tail.current.rotation.y = Math.sin(s.t * (mood === 'happy' ? 9 : 3)) * 0.5;

    // --- Dirt fades in when the pet is grubby ---
    const dirtOpacity = Math.min(1, Math.max(0, (60 - cleanliness) / 40)) * 0.9;
    for (const m of dirtMats.current) if (m) m.opacity = dirtOpacity;

    // --- Shadow shrinks while airborne ---
    if (shadow.current) shadow.current.scale.setScalar(1 - Math.min(0.5, hopY * 0.3));
  });

  return (
    <>
      <group ref={root}>
        {/* Body */}
        <group ref={body} position={[0, 1.15, 0]}>
          <mesh castShadow onClick={(e) => { e.stopPropagation(); onPet(); }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}>
            <sphereGeometry args={[1, 48, 36]} />
            <meshStandardMaterial color={WHITE} roughness={0.75} />
          </mesh>

          {BODY_PATCHES.map((p, i) => (
            <Surface key={`p${i}`} center={[0, 0, 0]} radius={1} dir={p.dir}>
              <mesh scale={[p.s, p.s * 0.85, 0.12]}>
                <sphereGeometry args={[1, 18, 14]} />
                <meshStandardMaterial color="#3b2d28" roughness={0.8} />
              </mesh>
            </Surface>
          ))}

          {DIRT.map((p, i) => (
            <Surface key={`d${i}`} center={[0, 0, 0]} radius={0.98} dir={p.dir}>
              <mesh scale={[p.s, p.s * 0.8, 0.05]}>
                <sphereGeometry args={[1, 14, 10]} />
                <meshStandardMaterial
                  ref={(m) => (dirtMats.current[i] = m)}
                  color="#7d6248"
                  transparent
                  opacity={0}
                  depthWrite={false}
                />
              </mesh>
            </Surface>
          ))}

          {/* Bow tie and bell */}
          <Surface center={[0, 0, 0]} radius={0.98} dir={[0, 0.42, 0.9]}>
            <mesh>
              <sphereGeometry args={[0.08, 14, 10]} />
              <meshStandardMaterial color="#ff5f7e" />
            </mesh>
            <mesh position={[-0.14, 0, 0]} scale={[1, 0.6, 0.45]}>
              <sphereGeometry args={[0.12, 14, 10]} />
              <meshStandardMaterial color="#ff5f7e" />
            </mesh>
            <mesh position={[0.14, 0, 0]} scale={[1, 0.6, 0.45]}>
              <sphereGeometry args={[0.12, 14, 10]} />
              <meshStandardMaterial color="#ff5f7e" />
            </mesh>
          </Surface>
          <Surface center={[0, 0, 0]} radius={0.96} dir={[0, 0.2, 1]}>
            <mesh>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial color="#ffd34d" metalness={0.4} roughness={0.3} />
            </mesh>
          </Surface>

          {/* Tail */}
          <group ref={tail} position={[0, 0.1, -0.95]}>
            <mesh position={[0, 0, -0.2]} rotation={[PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
              <meshStandardMaterial color={WHITE} />
            </mesh>
            <mesh position={[0, 0, -0.42]}>
              <sphereGeometry args={[0.12, 12, 10]} />
              <meshStandardMaterial color="#3b2d28" />
            </mesh>
          </group>
        </group>

        {/* Legs */}
        {[
          [-0.5, 0.25, 0.35],
          [0.5, 0.25, 0.35],
          [-0.5, 0.25, -0.35],
          [0.5, 0.25, -0.35],
        ].map((p, i) => (
          <group key={`leg${i}`} position={p}>
            <mesh castShadow>
              <cylinderGeometry args={[0.2, 0.22, 0.5, 14]} />
              <meshStandardMaterial color={WHITE} />
            </mesh>
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.1, 14]} />
              <meshStandardMaterial color="#4a3426" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Head */}
      <group ref={head} position={[0, 2.2, 0]}>
        <mesh castShadow onClick={(e) => { e.stopPropagation(); onPet(); }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}>
          <sphereGeometry args={[0.8, 40, 30]} />
          <meshStandardMaterial color={WHITE} roughness={0.7} />
        </mesh>

        <Surface center={[0, 0, 0]} radius={0.79} dir={[-0.7, 0.45, 0.55]}>
          <mesh scale={[0.3, 0.26, 0.06]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshStandardMaterial color="#3b2d28" />
          </mesh>
        </Surface>

        {/* Ears */}
        <group position={[-0.78, 0.2, 0]} rotation={[0, 0, 0.5]}>
          <mesh scale={[0.5, 0.24, 0.14]}>
            <sphereGeometry args={[0.6, 16, 12]} />
            <meshStandardMaterial color="#ffb3c7" />
          </mesh>
        </group>
        <group position={[0.78, 0.2, 0]} rotation={[0, 0, -0.5]}>
          <mesh scale={[0.5, 0.24, 0.14]}>
            <sphereGeometry args={[0.6, 16, 12]} />
            <meshStandardMaterial color="#ffb3c7" />
          </mesh>
        </group>

        {/* Horns */}
        <mesh position={[-0.42, 0.85, 0]} rotation={[0, 0, 0.35]}>
          <coneGeometry args={[0.07, 0.34, 14]} />
          <meshStandardMaterial color="#f5e6b8" />
        </mesh>
        <mesh position={[0.42, 0.85, 0]} rotation={[0, 0, -0.35]}>
          <coneGeometry args={[0.07, 0.34, 14]} />
          <meshStandardMaterial color="#f5e6b8" />
        </mesh>

        {/* Eyes */}
        <Surface center={[0, 0, 0]} radius={0.78} dir={[-0.36, 0.14, 0.9]}>
          <group ref={eyeL}>
            <mesh scale={[1, 1.2, 0.5]}>
              <sphereGeometry args={[0.12, 20, 16]} />
              <meshStandardMaterial color="#1d1a1f" roughness={0.3} />
            </mesh>
            <mesh position={[0.035, 0.045, 0.06]}>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </Surface>
        <Surface center={[0, 0, 0]} radius={0.78} dir={[0.36, 0.14, 0.9]}>
          <group ref={eyeR}>
            <mesh scale={[1, 1.2, 0.5]}>
              <sphereGeometry args={[0.12, 20, 16]} />
              <meshStandardMaterial color="#1d1a1f" roughness={0.3} />
            </mesh>
            <mesh position={[0.035, 0.045, 0.06]}>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </Surface>

        {/* Blush */}
        <Surface center={[0, 0, 0]} radius={0.78} dir={[-0.85, -0.12, 0.5]}>
          <mesh scale={[0.18, 0.12, 0.03]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#ff8fb1" transparent opacity={0.75} />
          </mesh>
        </Surface>
        <Surface center={[0, 0, 0]} radius={0.78} dir={[0.85, -0.12, 0.5]}>
          <mesh scale={[0.18, 0.12, 0.03]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshStandardMaterial color="#ff8fb1" transparent opacity={0.75} />
          </mesh>
        </Surface>

        {/* Snout */}
        <mesh position={[0, -0.2, 0.58]} scale={[1.2, 0.85, 0.7]}>
          <sphereGeometry args={[0.36, 28, 20]} />
          <meshStandardMaterial color="#ffb9c7" roughness={0.6} />
        </mesh>
        <mesh position={[-0.12, -0.2, 0.84]} scale={[1, 0.7, 0.5]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#b5546d" />
        </mesh>
        <mesh position={[0.12, -0.2, 0.84]} scale={[1, 0.7, 0.5]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#b5546d" />
        </mesh>

        {/* Mouth: smile, frown and an open "o" used for chewing and hunger */}
        <mesh ref={smile} position={[0, -0.4, 0.82]} rotation={[0, 0, PI]}>
          <torusGeometry args={[0.1, 0.022, 8, 20, PI]} />
          <meshStandardMaterial color="#7a2e44" />
        </mesh>
        <mesh ref={frown} position={[0, -0.46, 0.82]} visible={false}>
          <torusGeometry args={[0.1, 0.022, 8, 20, PI]} />
          <meshStandardMaterial color="#7a2e44" />
        </mesh>
        <mesh ref={open} position={[0, -0.42, 0.84]} visible={false}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshStandardMaterial color="#7a1f3d" />
        </mesh>

        {/* Anchors */}
        <group ref={mouth} position={[0, -0.42, 0.9]} />
        <group ref={top} position={[0, 0.9, 0]} />
      </group>

      {/* Shadow */}
      <mesh ref={shadow} rotation={[-PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.25, 40]} />
        <meshBasicMaterial color="#2a1f3d" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {/* Food being carried to the mouth (world space) */}
      <group ref={carry} visible={false}>
        {Object.keys(FOODS).map((id) => (
          <group key={id} ref={(el) => (kids.current[id] = el)} visible={false}>
            <FoodModel id={id} />
          </group>
        ))}
      </group>

      {/* Ball */}
      <group ref={ball} position={BALL_REST}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 20, 16]} />
          <meshStandardMaterial color="#ff7ea0" roughness={0.4} />
        </mesh>
        <mesh rotation={[PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.03, 8, 24]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
    </>
  );
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth(t) {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}
