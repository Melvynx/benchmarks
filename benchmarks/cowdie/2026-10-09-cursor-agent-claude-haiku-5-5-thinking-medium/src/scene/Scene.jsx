import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { on } from '../game/events.js';
import { Cowdie } from './Cowdie.jsx';
import { FoodModel } from './FoodModel.jsx';
import { ParticlePool } from './particles.jsx';
import { FOOD_SLOTS, PLATE_Y, TABLE } from './layout.js';

const DAY = new THREE.Color('#bfe9ff');
const NIGHT = new THREE.Color('#2a2f5c');
const PI = Math.PI;

// Deterministic random so the scenery is stable across renders.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(7);
const TUFTS = Array.from({ length: 46 }, () => {
  const a = rand() * PI * 2;
  const r = 3.2 + rand() * 4.5;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r - 0.5, s: 0.6 + rand() * 0.7 };
});
const FLOWERS = Array.from({ length: 22 }, () => {
  const a = rand() * PI * 2;
  const r = 2.5 + rand() * 4.5;
  const colors = ['#ff8fb1', '#fff07a', '#ffffff', '#b59cff'];
  return {
    x: Math.cos(a) * r,
    z: Math.sin(a) * r - 0.5,
    c: colors[Math.floor(rand() * colors.length)],
  };
});
const CLOUDS = [
  { x: -6, y: 6.2, z: -5, s: 1 },
  { x: 2, y: 7.4, z: -8, s: 1.3 },
  { x: 8, y: 5.6, z: -4, s: 0.9 },
];

function Clouds({ sleeping }) {
  const refs = useRef([]);
  useFrame((_, dt) => {
    refs.current.forEach((g, i) => {
      if (!g) return;
      const c = CLOUDS[i];
      g.position.x += dt * (0.2 + i * 0.05);
      if (g.position.x > 12) g.position.x = -12;
      g.visible = !sleeping || i === 0;
    });
  });
  return CLOUDS.map((c, i) => (
    <group key={i} ref={(el) => (refs.current[i] = el)} position={[c.x, c.y, c.z]} scale={c.s}>
      {[[0, 0, 0, 0.9], [0.9, -0.2, 0, 0.7], [-0.9, -0.25, 0, 0.7], [0.4, 0.5, 0, 0.6]].map((p, k) => (
        <mesh key={k} position={[p[0], p[1], p[2]]}>
          <sphereGeometry args={[p[3], 16, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  ));
}

function Table({ onPick, hidden }) {
  const [hover, setHover] = useState(null);
  const plates = Object.keys(FOOD_SLOTS);

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
  }, [hover]);

  return (
    <group>
      {/* Top + legs */}
      <mesh position={TABLE.center} receiveShadow castShadow>
        <boxGeometry args={TABLE.size} />
        <meshStandardMaterial color="#d9a066" roughness={0.7} />
      </mesh>
      {[-2.8, 2.8].flatMap((x) =>
        [TABLE.center[2] - 0.55, TABLE.center[2] + 0.55].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.18, z]} castShadow>
            <boxGeometry args={[0.16, 0.36, 0.16]} />
            <meshStandardMaterial color="#b97f47" />
          </mesh>
        )),
      )}

      {/* Plates and food, clickable */}
      {plates.map((id) => {
        const [x, y, z] = FOOD_SLOTS[id];
        const isHover = hover === id;
        const isHidden = hidden === id;
        return (
          <group key={id}>
            <mesh position={[x, PLATE_Y - 0.02, z]} receiveShadow>
              <cylinderGeometry args={[0.48, 0.48, 0.04, 28]} />
              <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </mesh>
            <group
              position={[x, y, z]}
              scale={isHover ? 1.12 : 1}
              visible={!isHidden}
              onPointerOver={(e) => { e.stopPropagation(); setHover(id); }}
              onPointerOut={() => setHover((h) => (h === id ? null : h))}
              onClick={(e) => { e.stopPropagation(); onPick(id); }}
            >
              <FoodModel id={id} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

export function Scene({ mood, sleeping, cleanliness, onFeed, onPet }) {
  const scene = useThree((s) => s.scene);
  const bg = useMemo(() => DAY.clone(), []);
  const [hiddenFood, setHiddenFood] = useState(null);
  const sun = useRef();
  const ambient = useRef();

  // Hide a food from the table while it's being eaten; bring it back afterwards.
  useEffect(() => {
    const offs = [
      on('feed', ({ id }) => setHiddenFood(id)),
      on('feedDone', () => setHiddenFood(null)),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 16, 34);
  }, [scene, bg]);

  useFrame((_, dt) => {
    const target = sleeping ? NIGHT : DAY;
    bg.lerp(target, Math.min(1, dt * 1.5));
    if (scene.fog) scene.fog.color.copy(bg);
    if (sun.current) sun.current.intensity = sleeping ? 0.25 : 1.2;
    if (ambient.current) ambient.current.intensity = sleeping ? 0.35 : 0.85;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.85} />
      <directionalLight
        ref={sun}
        position={[4, 8, 6]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <hemisphereLight args={['#ffffff', '#9ad49a', 0.4]} />

      {/* Sun */}
      <mesh position={[-6, 7, -7]}>
        <sphereGeometry args={[0.9, 24, 16]} />
        <meshBasicMaterial color="#fff3a3" />
      </mesh>

      {/* Ground */}
      <mesh rotation={[-PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#b5f0a8" roughness={1} />
      </mesh>
      <mesh rotation={[-PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[7.5, 7.7, 64]} />
        <meshStandardMaterial color="#ffc6dc" />
      </mesh>

      {TUFTS.map((t, i) => (
        <mesh key={`t${i}`} position={[t.x, 0.2 * t.s, t.z]} scale={t.s}>
          <coneGeometry args={[0.12, 0.4, 5]} />
          <meshStandardMaterial color="#7fcf74" />
        </mesh>
      ))}
      {FLOWERS.map((f, i) => (
        <group key={`f${i}`} position={[f.x, 0, f.z]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
            <meshStandardMaterial color="#5fb35a" />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial color={f.c} />
          </mesh>
        </group>
      ))}

      <Clouds sleeping={sleeping} />

      <Table onPick={onFeed} hidden={hiddenFood} />

      <Cowdie mood={mood} sleeping={sleeping} cleanliness={cleanliness} onPet={onPet} />

      <ParticlePool />
    </>
  );
}
