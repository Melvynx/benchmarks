import { useEffect, useRef, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MathUtils, NeutralToneMapping, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import { controls, pet, pointer, ui, view } from "../game/runtime";
import { useGame } from "../game/store";
import { SkyAndLights } from "./Sky";
import { Island } from "./Island";
import { Cow } from "./Cow";
import { Egg } from "./Egg";
import { Ball, DraggedFood, FloatingTexts, Poops, WorldFoods } from "./Interactables";
import { Effects } from "./Effects";

const TARGET = new Vector3(0, 0.55, 0);

function CameraRig() {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const mode = useGame((s) => s.mode);

  useEffect(() => {
    controls.enabled = (v) => {
      if (ref.current) ref.current.enabled = v && useGame.getState().mode !== "clean";
    };
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.enabled = mode !== "clean";
  }, [mode]);

  const shift = useRef(0);
  const follow = useRef(new Vector3());
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const { width: w, height: h } = state.size;
    const cam = state.camera as PerspectiveCamera;

    const c = ref.current;
    if (c) {
      const k = w / h < 1 ? 0.7 : 0;
      const f = follow.current;
      const nx = MathUtils.damp(f.x, pet.pos.x * k, 1.8, dt);
      const nz = MathUtils.damp(f.z, pet.pos.z * k * 0.4, 1.8, dt);
      const dx = nx - f.x;
      const dz = nz - f.z;
      if (Math.abs(dx) + Math.abs(dz) > 1e-5) {
        f.set(nx, 0, nz);
        c.target.x += dx;
        c.target.z += dz;
        cam.position.x += dx;
        cam.position.z += dz;
      }
    }

    const goal = MathUtils.clamp((ui.bottom - ui.top) / 2, -h * 0.2, h * 0.2);
    const next = shift.current + (goal - shift.current) * (1 - Math.exp(-dt * 6));
    if (Math.abs(next - shift.current) < 0.05 && cam.view?.fullHeight === h && cam.view.fullWidth === w) return;
    shift.current = next;
    cam.setViewOffset(w, h, 0, next, w, h);
  });

  useEffect(() => {
    const aspect = width / height;
    const dist = aspect < 0.62 ? 17 : aspect < 0.85 ? 15 : aspect < 1.2 ? 13 : aspect < 1.6 ? 10.8 : 9.9;
    const target = TARGET.clone().add(follow.current);
    if (aspect < 0.85) target.y = 0.3;
    const dir = new Vector3(0, 0.4, 1).normalize();
    camera.position.copy(dir.multiplyScalar(dist).add(target));
    if (ref.current) {
      ref.current.target.copy(target);
      ref.current.update();
    }
  }, [width, height, camera]);

  return (
    <OrbitControls
      ref={ref}
      target={TARGET}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={6.5}
      maxDistance={21}
      minPolarAngle={0.55}
      maxPolarAngle={1.36}
      minAzimuthAngle={-1.15}
      maxAzimuthAngle={1.15}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
    />
  );
}

const raycaster = new Raycaster();
const ndc = new Vector2();
const plane = new Plane();
const dir = new Vector3();

function PointerTracker() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const last = useRef({ x: -1, y: -1 });

  useEffect(() => {
    view.camera = camera;
    view.canvas = gl.domElement;
  }, [camera, gl]);

  useFrame((state) => {
    if (pointer.x !== last.current.x || pointer.y !== last.current.y) {
      last.current = { x: pointer.x, y: pointer.y };
      pointer.movedAt = state.clock.elapsedTime;
    }
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(((pointer.x - rect.left) / rect.width) * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    camera.getWorldDirection(dir);
    plane.setFromNormalAndCoplanarPoint(dir.negate(), pet.head);
    raycaster.ray.intersectPlane(plane, pointer.world);
  });
  return null;
}

export function Scene() {
  return (
    <Canvas
      className="scene"
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [0, 4.4, 10.4], fov: 36, near: 0.1, far: 220 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = 1.02;
      }}
    >
      <SkyAndLights />
      <Island />
      <Egg />
      <Cow />
      <Poops />
      <WorldFoods />
      <DraggedFood />
      <Ball />
      <Effects />
      <FloatingTexts />
      <CameraRig />
      <PointerTracker />
    </Canvas>
  );
}
