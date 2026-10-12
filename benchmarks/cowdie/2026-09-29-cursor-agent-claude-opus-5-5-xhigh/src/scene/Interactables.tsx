import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BufferAttribute,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Plane,
  Quaternion,
  Raycaster,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";
import { FOODS } from "../game/content";
import {
  ball,
  constrain,
  cowEvents,
  drag,
  floatEls,
  ISLAND_RADIUS,
  OBSTACLES,
  pet,
  pointer,
  rand,
  ROAM_RADIUS,
} from "../game/runtime";
import { useGame, type Poop, type WorldFood } from "../game/store";
import { sfx } from "../game/audio";
import { emit } from "./fx";
import { FoodModel } from "./FoodModel";

const tmp = new Vector3();
const tmpB = new Vector3();
const rollTo = new Vector3();

function FoodEntity({ f }: { f: WorldFood }) {
  const ref = useRef<Group>(null!);
  const restYaw = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = useGame.getState();
    const node = ref.current;
    if (f.state === "homing") {
      f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      tmp.copy(f.from).lerp(pet.mouth, k);
      tmp.y += Math.sin(k * Math.PI) * 1.0;
      f.pos.copy(tmp);
      node.rotation.z += f.spin * dt;
      node.rotation.x += f.spin * 0.4 * dt;
      if (f.t >= 1) {
        const res = g.feed(f.food);
        if (res === "ok") {
          g.removeFood(f.id);
          return;
        }
        f.state = "falling";
        const away = tmpB.copy(f.from).sub(pet.mouth).setY(0).normalize();
        f.vel.set(away.x * 1.3 + rand(-0.5, 0.5), 2.6, away.z * 1.3 + rand(-0.5, 0.5));
        sfx.bonk();
        emit("star", f.pos, { count: 3, speed: 1.2, size: 0.1, life: 0.5 });
        if (res === "full" || res === "busy") cowEvents.emit({ type: "refuse", reason: res });
      }
    } else if (f.state === "falling") {
      f.vel.y -= 9.8 * dt;
      f.pos.addScaledVector(f.vel, dt);
      const onIsland = Math.hypot(f.pos.x, f.pos.z) < ISLAND_RADIUS - 0.15;
      const floor = 0.1;
      if (onIsland && f.pos.y <= floor && f.vel.y < 0) {
        f.pos.y = floor;
        if (Math.abs(f.vel.y) > 1.2 && f.bounces < 3) {
          f.vel.y *= -0.38;
          f.vel.x *= 0.6;
          f.vel.z *= 0.6;
          f.bounces++;
          emit("dust", tmp.copy(f.pos).setY(0.04), { count: 3, speed: 0.4, up: 0.2, size: 0.07, life: 0.5, color: "#f1e3c8" });
        } else {
          f.state = "rest";
          f.vel.set(0, 0, 0);
        }
      }
      node.rotation.z += f.spin * dt;
      if (f.pos.y < -10) {
        g.removeFood(f.id);
        g.toast(`The ${FOODS[f.food].name.toLowerCase()} tumbled off the island!`, "info");
        return;
      }
    } else {
      const t = state.clock.elapsedTime;
      const reach = constrain(rollTo.set(f.pos.x, 0, f.pos.z), 0.25);
      const off = Math.hypot(reach.x - f.pos.x, reach.z - f.pos.z);
      if (off > 0.02) {
        const step = Math.min(off, dt * (0.6 + off * 1.6));
        const ux = (reach.x - f.pos.x) / off;
        const uz = (reach.z - f.pos.z) / off;
        f.pos.x += ux * step;
        f.pos.z += uz * step;
        node.rotation.x += uz * step * 5;
        node.rotation.z -= ux * step * 5;
      } else {
        node.rotation.x = MathDamp(node.rotation.x, 0, dt);
        node.rotation.z = MathDamp(node.rotation.z, 0, dt);
      }
      node.rotation.y = restYaw + t * 0.8;
      f.pos.y = 0.1 + Math.sin(t * 2.5 + f.id) * 0.02;
    }
    node.position.copy(f.pos);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (f.state !== "rest") return;
    const g = useGame.getState();
    const check = g.canEat(f.food);
    if (check === "ok") {
      f.state = "homing";
      f.from = f.pos.clone();
      f.t = 0;
      f.dur = 0.6;
      sfx.whoosh();
    } else if (check === "full") {
      g.toast(`${g.name} is full. Save it for later!`, "info");
      cowEvents.emit({ type: "refuse", reason: "full" });
    } else if (check === "asleep") {
      g.toast(`Shh... ${g.name} is sleeping`, "info");
    }
  };

  return (
    <group
      ref={ref}
      position={f.pos}
      onClick={onClick}
      onPointerOver={() => (document.body.dataset.hover = "item")}
      onPointerOut={() => delete document.body.dataset.hover}
    >
      <FoodModel id={f.food} />
      <mesh visible={false} scale={0.22}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
}

function MathDamp(v: number, target: number, dt: number) {
  return v + (target - v) * (1 - Math.exp(-8 * dt));
}

export function WorldFoods() {
  const foods = useGame((s) => s.foods);
  return (
    <>
      {foods.map((f) => (
        <FoodEntity key={f.id} f={f} />
      ))}
    </>
  );
}

const raycaster = new Raycaster();
const ndc = new Vector2();
const plane = new Plane();
const camDir = new Vector3();
const hit = new Vector3();
const planePoint = new Vector3();

export function DraggedFood() {
  const food = useGame((s) => s.drag);
  const ref = useRef<Group>(null!);
  const fresh = useRef(true);
  const lastRefuse = useRef(0);
  const gl = useThree((s) => s.gl);

  useLayoutEffect(() => {
    fresh.current = true;
    drag.valid = false;
  }, [food]);

  useFrame((state, rawDt) => {
    if (!food || !ref.current) return;
    const dt = Math.min(rawDt, 0.05);
    const cam = state.camera;
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(((pointer.x - rect.left) / rect.width) * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, cam);
    cam.getWorldDirection(camDir);
    planePoint.copy(pet.mouth).addScaledVector(camDir, -0.35);
    plane.setFromNormalAndCoplanarPoint(camDir.clone().negate(), planePoint);
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    if (fresh.current) {
      drag.pos.copy(hit);
      fresh.current = false;
    } else {
      drag.pos.lerp(hit, 1 - Math.exp(-dt * 28));
    }
    drag.valid = true;
    const t = state.clock.elapsedTime;
    ref.current.position.copy(drag.pos);
    ref.current.rotation.set(Math.sin(t * 3) * 0.15, Math.sin(t * 2) * 0.3, Math.sin(t * 4) * 0.12);
    const s = 1.35 + Math.sin(t * 6) * 0.04;
    ref.current.scale.setScalar(s);

    const g = useGame.getState();
    const d = drag.pos.distanceTo(planePoint);
    if (d < 0.34 * Math.max(0.85, pet.scale)) {
      const check = g.canEat(food);
      if (check === "ok") {
        g.feed(food);
        useGame.setState({ drag: null });
        drag.valid = false;
      } else if ((check === "full" || check === "busy") && t - lastRefuse.current > 1.6) {
        lastRefuse.current = t;
        cowEvents.emit({ type: "refuse", reason: check });
      }
    }
  });

  if (!food) return null;
  return (
    <group ref={ref} renderOrder={20}>
      <FoodModel id={food} overlay />
    </group>
  );
}

function useBallGeometry() {
  return useMemo(() => {
    const g = new SphereGeometry(1, 48, 24).toNonIndexed();
    const pos = g.attributes.position as BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const palette = ["#ff5d73", "#ffffff", "#ffc93c", "#ffffff", "#3fb8ff", "#ffffff"].map((c) => new Color(c));
    const cap = new Color("#ffffff");
    for (let i = 0; i < pos.count; i += 3) {
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (let k = 0; k < 3; k++) {
        cx += pos.getX(i + k);
        cy += pos.getY(i + k);
        cz += pos.getZ(i + k);
      }
      const a = Math.atan2(cz, cx) + Math.PI;
      const sector = Math.floor((a / (Math.PI * 2)) * 6) % 6;
      const c = Math.abs(cy / 3) > 0.9 ? cap : palette[sector];
      for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3);
    }
    g.setAttribute("color", new BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
}

export function Ball() {
  const ref = useRef<Mesh>(null!);
  const vis = useRef(0);
  const geo = useBallGeometry();
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }), []);
  const q = useMemo(() => new Quaternion(), []);
  const axis = useMemo(() => new Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const active = useGame.getState().mode === "play";
    vis.current += ((active ? 1 : 0) - vis.current) * (1 - Math.exp(-dt * 8));
    const m = ref.current;
    m.visible = vis.current > 0.02;
    if (!m.visible) return;
    const r = ball.radius;
    if (active) {
      ball.vel.y -= 9.8 * dt;
      ball.pos.addScaledVector(ball.vel, dt);
      if (ball.pos.y < r) {
        ball.pos.y = r;
        if (ball.vel.y < -1) {
          if (ball.vel.y < -2.5) sfx.bubble();
          ball.vel.y *= -0.6;
        } else ball.vel.y = 0;
        ball.vel.x *= 1 - 1.6 * dt;
        ball.vel.z *= 1 - 1.6 * dt;
      }
      const hr = Math.hypot(ball.pos.x, ball.pos.z);
      const lim = ROAM_RADIUS + 0.35;
      if (hr > lim) {
        const nx = ball.pos.x / hr;
        const nz = ball.pos.z / hr;
        ball.pos.x = nx * lim;
        ball.pos.z = nz * lim;
        const dot = ball.vel.x * nx + ball.vel.z * nz;
        if (dot > 0) {
          ball.vel.x -= 1.8 * dot * nx;
          ball.vel.z -= 1.8 * dot * nz;
        }
      }
      for (const o of OBSTACLES) {
        const dx = ball.pos.x - o.x;
        const dz = ball.pos.z - o.z;
        const d = Math.hypot(dx, dz);
        const min = o.r + r;
        if (d < min && d > 1e-4) {
          const nx = dx / d;
          const nz = dz / d;
          ball.pos.x = o.x + nx * min;
          ball.pos.z = o.z + nz * min;
          const dot = ball.vel.x * nx + ball.vel.z * nz;
          if (dot < 0) {
            ball.vel.x -= 1.7 * dot * nx;
            ball.vel.z -= 1.7 * dot * nz;
          }
        }
      }
      const cd = Math.hypot(ball.pos.x - pet.pos.x, ball.pos.z - pet.pos.z);
      const cmin = 0.5 * pet.scale + r;
      if (cd < cmin && cd > 1e-4 && ball.pos.y < 1.2) {
        ball.pos.x = pet.pos.x + ((ball.pos.x - pet.pos.x) / cd) * cmin;
        ball.pos.z = pet.pos.z + ((ball.pos.z - pet.pos.z) / cd) * cmin;
      }
      const speed = Math.hypot(ball.vel.x, ball.vel.z);
      if (speed > 0.01 && ball.pos.y <= r + 0.01) {
        axis.set(ball.vel.z, 0, -ball.vel.x).normalize();
        q.setFromAxisAngle(axis, (speed * dt) / r);
        m.quaternion.premultiply(q);
      }
    }
    m.position.copy(ball.pos);
    m.scale.setScalar(r * vis.current);
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const g = useGame.getState();
    if (g.mode !== "play") return;
    e.stopPropagation();
    const away = tmp.set(ball.pos.x - pet.pos.x, 0, ball.pos.z - pet.pos.z);
    const toPet = away.clone().negate().normalize();
    const ang = rand(-0.9, 0.9);
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const dir = new Vector3(toPet.x * c - toPet.z * s, 0, toPet.x * s + toPet.z * c);
    ball.vel.set(dir.x * rand(1.5, 2.8), rand(3.5, 5), dir.z * rand(1.5, 2.8));
    g.rallyHit("user");
    sfx.kick();
    emit("sparkle", ball.pos, { count: 6, speed: 1.4, size: 0.12, life: 0.6, color: ["#fff6b0", "#ffffff", "#ffc6e0"] });
  };

  return (
    <mesh
      ref={ref}
      geometry={geo}
      material={mat}
      castShadow
      onPointerDown={onDown}
      onPointerOver={() => {
        if (useGame.getState().mode === "play") document.body.dataset.hover = "item";
      }}
      onPointerOut={() => delete document.body.dataset.hover}
    />
  );
}

const poopMat = new MeshStandardMaterial({ color: "#8a5a3c", roughness: 0.35 });
const poopHi = new MeshStandardMaterial({ color: "#a9744f", roughness: 0.3 });

function PoopItem({ p }: { p: Poop }) {
  const ref = useRef<Group>(null!);
  const flies = useRef<Group>(null!);
  const born = useRef(-1);
  const nextStink = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (born.current < 0) born.current = t;
    const age = t - born.current;
    const k = Math.min(1, age / 0.45);
    const pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.35 : 1;
    ref.current.scale.set(pop * Math.min(1, k * 2), Math.min(1, k * 2) * (1 + Math.sin(t * 3 + p.id) * 0.03), pop * Math.min(1, k * 2));
    if (t > nextStink.current) {
      nextStink.current = t + rand(1.1, 1.9);
      emit("steam", tmp.set(p.x + rand(-0.08, 0.08), 0.35, p.z + rand(-0.08, 0.08)), {
        count: 1,
        speed: 0.1,
        up: 0.45,
        size: 0.05,
        life: 1.4,
        drag: 0.6,
        color: "#c8dd8f",
        sway: 0.4,
      });
    }
    const f = flies.current;
    const oldEnough = Date.now() - p.born > 20000;
    f.visible = oldEnough;
    if (oldEnough) {
      f.children.forEach((c, i) => {
        const a = t * (3 + i) + i * 3;
        c.position.set(Math.cos(a) * 0.28, 0.45 + Math.sin(a * 1.7) * 0.08, Math.sin(a) * 0.25);
      });
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const g = useGame.getState();
    if (g.asleep) return;
    emit("sparkle", tmp.set(p.x, 0.3, p.z), { count: 14, speed: 1.4, up: 0.8, size: 0.13, life: 0.8, radius: 0.15, color: ["#ffffff", "#bff0ff", "#fff3a8"] });
    emit("dust", tmp.set(p.x, 0.1, p.z), { count: 6, speed: 0.8, up: 0.3, size: 0.1, life: 0.6, color: "#f1e3c8" });
    g.cleanPoop(p.id);
    delete document.body.dataset.hover;
  };

  return (
    <group position={[p.x, 0, p.z]}>
      <group
        ref={ref}
        onClick={onClick}
        onPointerOver={() => (document.body.dataset.hover = "poop")}
        onPointerOut={() => delete document.body.dataset.hover}
      >
        <mesh material={poopMat} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.13, 0.07, 10, 22]} />
        </mesh>
        <mesh material={poopMat} position={[0, 0.06, 0]} scale={[0.13, 0.06, 0.13]}>
          <sphereGeometry args={[1, 14, 8]} />
        </mesh>
        <mesh material={poopMat} position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.085, 0.06, 10, 20]} />
        </mesh>
        <mesh material={poopMat} position={[0, 0.16, 0]} scale={[0.09, 0.06, 0.09]}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        <mesh material={poopMat} position={[0.01, 0.24, 0]} rotation={[0, 0, -0.35]}>
          <coneGeometry args={[0.06, 0.12, 12]} />
        </mesh>
        <mesh material={poopHi} position={[-0.06, 0.1, 0.12]} scale={[0.03, 0.02, 0.012]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        <mesh visible={false} position={[0, 0.15, 0]} scale={[0.25, 0.25, 0.25]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      </group>
      <group ref={flies}>
        {[0, 1].map((i) => (
          <mesh key={i} scale={0.022}>
            <sphereGeometry args={[1, 6, 4]} />
            <meshStandardMaterial color="#2b2530" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Poops() {
  const poops = useGame((s) => s.poops);
  return (
    <>
      {poops.map((p) => (
        <PoopItem key={p.id} p={p} />
      ))}
    </>
  );
}

export function FloatingTexts() {
  const v = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    if (!floatEls.size) return;
    for (const f of useGame.getState().floats) {
      const el = floatEls.get(f.id);
      if (!el) continue;
      v.set(f.pos[0], f.pos[1], f.pos[2]).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.visibility = v.z < 1 ? "visible" : "hidden";
    }
  });
  return null;
}
