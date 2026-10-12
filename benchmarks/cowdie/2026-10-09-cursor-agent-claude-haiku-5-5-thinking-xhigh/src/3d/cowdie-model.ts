import * as THREE from "three";

export interface CowdieParts {
  root: THREE.Group;
  pivot: THREE.Group;
  body: THREE.Group;
  face: THREE.Group;
  mouthAnchor: THREE.Object3D;
  eyes: THREE.Group[];
  pupils: THREE.Object3D[];
  eyeRound: THREE.Object3D[];
  eyeArcs: THREE.Mesh[];
  smileArc: THREE.Mesh;
  frownArc: THREE.Mesh;
  openMouth: THREE.Mesh;
  brows: THREE.Mesh[];
  blushes: THREE.Mesh[];
  ears: THREE.Group[];
  horns: THREE.Object3D[];
  spots: THREE.Object3D[];
  dirt: THREE.Object3D[];
  tail: THREE.Group;
  hooves: THREE.Mesh[];
  blushMaterial: THREE.MeshStandardMaterial;
}

/** Resting angle for ears (radians). Positive on the right, negative on the left, so both point outward. */
export const EAR_REST_ANGLE = 0.28;

/** Deterministic PRNG so Cowdie's spots are identical on every load. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildCowdie(): CowdieParts {
  const mat = {
    body: new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.55 }),
    spot: new THREE.MeshStandardMaterial({ color: 0x3d2f2b, roughness: 0.7 }),
    inner: new THREE.MeshStandardMaterial({ color: 0xffb3bb, roughness: 0.6 }),
    horn: new THREE.MeshStandardMaterial({ color: 0xf1e3c2, roughness: 0.4 }),
    nose: new THREE.MeshStandardMaterial({ color: 0xffa3b4, roughness: 0.5 }),
    white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }),
    ink: new THREE.MeshStandardMaterial({ color: 0x2b2320, roughness: 0.3 }),
    glint: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x6b2d3b, roughness: 0.6 }),
    tongue: new THREE.MeshStandardMaterial({ color: 0xff7f9d, roughness: 0.5 }),
    hoof: new THREE.MeshStandardMaterial({ color: 0x5c4d48, roughness: 0.6 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x7a5a3f, roughness: 1, transparent: true, opacity: 0.9 }),
    blush: new THREE.MeshStandardMaterial({
      color: 0xff6f9a,
      roughness: 0.8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  };

  const root = new THREE.Group();
  const pivot = new THREE.Group();
  root.add(pivot);

  const body = new THREE.Group();
  body.position.y = 1;
  body.scale.set(1, 0.92, 0.95);
  pivot.add(body);

  const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 40), mat.body);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  body.add(bodyMesh);

  // Spots: flattened discs placed on the back and sides of the body.
  const rand = seeded(20260909);
  const spots: THREE.Object3D[] = [];
  const spotGeo = new THREE.SphereGeometry(1, 20, 12);
  const normal = new THREE.Vector3();
  const axisZ = new THREE.Vector3(0, 0, 1);
  while (spots.length < 9) {
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    normal.set(r * Math.cos(theta), u, r * Math.sin(theta));
    if (normal.z > 0.1 || normal.y < -0.45) continue;
    const size = 0.2 + rand() * 0.18;
    const spot = new THREE.Mesh(spotGeo, mat.spot);
    spot.position.copy(normal).multiplyScalar(0.985);
    spot.quaternion.setFromUnitVectors(axisZ, normal);
    spot.scale.set(size, size * (0.8 + rand() * 0.4), 0.06);
    spot.visible = false;
    body.add(spot);
    spots.push(spot);
  }

  // Dirt marks: appear as hygiene drops. Each one has a threshold.
  const dirt: THREE.Object3D[] = [];
  const dirtGeo = new THREE.SphereGeometry(1, 14, 10);
  while (dirt.length < 10) {
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    normal.set(r * Math.cos(theta), u, r * Math.sin(theta));
    if (normal.z < -0.3 && normal.y < 0) continue;
    const size = 0.1 + rand() * 0.09;
    const mark = new THREE.Mesh(dirtGeo, mat.dirt);
    mark.position.copy(normal).multiplyScalar(0.99);
    mark.quaternion.setFromUnitVectors(axisZ, normal);
    mark.scale.set(size, size * 0.8, 0.03);
    mark.visible = false;
    body.add(mark);
    dirt.push(mark);
  }

  // Face: everything lives in body space, so it squashes with the body.
  const face = new THREE.Group();
  body.add(face);

  const eyeRound: THREE.Object3D[] = [];
  const eyes: THREE.Group[] = [];
  const pupils: THREE.Object3D[] = [];
  const eyeArcs: THREE.Mesh[] = [];
  const eyeGeo = new THREE.SphereGeometry(0.13, 24, 18);
  const pupilGeo = new THREE.SphereGeometry(0.07, 18, 14);
  const glintGeo = new THREE.SphereGeometry(0.022, 10, 8);
  const arcGeo = new THREE.TorusGeometry(0.085, 0.022, 8, 20, Math.PI);
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.36, 0.22, 0.86);
    face.add(eye);
    eyes.push(eye);

    const round = new THREE.Group();
    eye.add(round);
    eyeRound.push(round);
    const white = new THREE.Mesh(eyeGeo, mat.white);
    round.add(white);

    const pupil = new THREE.Group();
    pupil.position.set(0, 0, 0.1);
    round.add(pupil);
    pupils.push(pupil);
    const iris = new THREE.Mesh(pupilGeo, mat.ink);
    pupil.add(iris);
    const glint = new THREE.Mesh(glintGeo, mat.glint);
    glint.position.set(0.03, 0.03, 0.06);
    pupil.add(glint);

    const arc = new THREE.Mesh(arcGeo, mat.ink);
    arc.position.set(0, 0.02, 0.1);
    arc.visible = false;
    eye.add(arc);
    eyeArcs.push(arc);
  }

  const brows: THREE.Mesh[] = [];
  const browGeo = new THREE.CapsuleGeometry(0.025, 0.14, 4, 8);
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(browGeo, mat.spot);
    brow.position.set(side * 0.36, 0.44, 0.92);
    brow.rotation.z = side * 0.25;
    face.add(brow);
    brows.push(brow);
  }

  const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat.nose);
  snout.scale.set(0.26, 0.18, 0.12);
  snout.position.set(0, -0.12, 0.9);
  face.add(snout);
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat.spot);
    nostril.position.set(side * 0.09, -0.11, 1.0);
    face.add(nostril);
  }

  const mouthAnchor = new THREE.Object3D();
  mouthAnchor.position.set(0, -0.36, 0.95);
  face.add(mouthAnchor);

  const smileArc = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI), mat.ink);
  smileArc.rotation.z = Math.PI;
  smileArc.position.copy(mouthAnchor.position);
  smileArc.visible = true;
  face.add(smileArc);
  const frownArc = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI), mat.ink);
  frownArc.position.copy(mouthAnchor.position).add(new THREE.Vector3(0, -0.03, 0));
  frownArc.scale.setScalar(0.0001);
  face.add(frownArc);

  const openShape = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat.mouth);
  openShape.scale.set(0.1, 0.12, 0.04);
  openShape.position.copy(mouthAnchor.position).add(new THREE.Vector3(0, -0.02, 0.01));
  face.add(openShape);
  const blushes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat.blush);
    blush.scale.set(0.15, 0.09, 0.02);
    blush.position.set(side * 0.55, -0.06, 0.74);
    blush.rotation.y = side * 0.55;
    face.add(blush);
    blushes.push(blush);
  }

  const ears: THREE.Group[] = [];
  const earGeo = new THREE.SphereGeometry(1, 24, 16);
  for (const side of [-1, 1]) {
    // Ear pivot sits inside the head; the ear flops out sideways and up.
    const ear = new THREE.Group();
    ear.position.set(side * 0.74, 1.28, -0.02);
    ear.rotation.z = side * EAR_REST_ANGLE;
    body.add(ear);
    const outer = new THREE.Mesh(earGeo, mat.body);
    outer.scale.set(0.44, 0.2, 0.12);
    outer.position.set(side * 0.26, 0, 0);
    outer.castShadow = true;
    ear.add(outer);
    const inner = new THREE.Mesh(earGeo, mat.inner);
    inner.scale.set(0.32, 0.13, 0.13);
    inner.position.set(side * 0.26, 0, 0.05);
    ear.add(inner);
    ears.push(ear);
  }

  const horns: THREE.Object3D[] = [];
  const hornGeo = new THREE.ConeGeometry(0.065, 0.3, 16);
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(hornGeo, mat.horn);
    horn.position.set(side * 0.36, 1.02, 0.25);
    horn.rotation.set(0.25, 0, side * -0.55);
    horn.scale.setScalar(0.0001);
    body.add(horn);
    horns.push(horn);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.92, -0.96);
  body.add(tail);
  const tailTip = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.18, 4, 10), mat.spot);
  tailTip.position.set(0, -0.08, -0.02);
  tailTip.rotation.x = 0.8;
  tail.add(tailTip);

  const hooves: THREE.Mesh[] = [];
  const hoofGeo = new THREE.SphereGeometry(1, 16, 12);
  for (const x of [-0.45, 0.45]) {
    for (const z of [-0.42, 0.42]) {
      const hoof = new THREE.Mesh(hoofGeo, mat.hoof);
      hoof.scale.set(0.2, 0.14, 0.2);
      hoof.position.set(x, 0.1, z);
      hoof.castShadow = true;
      pivot.add(hoof);
      hooves.push(hoof);
    }
  }

  return {
    root,
    pivot,
    body,
    face,
    mouthAnchor,
    eyes,
    pupils,
    eyeRound,
    eyeArcs,
    smileArc,
    frownArc,
    openMouth: openShape,
    brows,
    blushes,
    ears,
    horns,
    spots,
    dirt,
    tail,
    hooves,
    blushMaterial: mat.blush,
  };
}
