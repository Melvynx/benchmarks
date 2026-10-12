import * as THREE from 'three';
import { toon } from './textures';

const DAY = { top: new THREE.Color('#6fbfff'), mid: new THREE.Color('#bfe6ff'), bottom: new THREE.Color('#ffe8d2') };
const NIGHT = { top: new THREE.Color('#0a0f2e'), mid: new THREE.Color('#232c68'), bottom: new THREE.Color('#4b3a6e') };

const r = (a: number, b: number) => a + Math.random() * (b - a);
const flat = (color: number) => new THREE.MeshLambertMaterial({ color, flatShading: true });

export class World {
  readonly group = new THREE.Group();
  readonly islandRadius = 7;
  readonly walkRadius = 4.8;
  readonly butterfly = new THREE.Group();

  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private lamp: THREE.PointLight;
  private bulbMat: THREE.MeshBasicMaterial;
  private windowMat: THREE.MeshBasicMaterial;
  private sky: THREE.ShaderMaterial;
  private stars: THREE.Points;
  private fireflies: THREE.Points;
  private fireflyBase: Float32Array;
  private clouds = new THREE.Group();
  private wings: THREE.Group[] = [];
  private fog: THREE.Fog;
  private night = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);

    this.sky = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: DAY.top.clone() },
        mid: { value: DAY.mid.clone() },
        bottom: { value: DAY.bottom.clone() },
      },
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vPos;
        void main(){ float h = normalize(vPos).y;
          vec3 c = mix(bottom, mid, smoothstep(-0.25, 0.08, h));
          c = mix(c, top, smoothstep(0.08, 0.65, h));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), this.sky);
    skyMesh.renderOrder = -1;
    this.group.add(skyMesh);

    this.fog = new THREE.Fog(DAY.mid.clone(), 30, 80);
    scene.fog = this.fog;

    this.hemi = new THREE.HemisphereLight(0xe4f4ff, 0xa9d38c, 1.5);
    this.group.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3dc, 2.3);
    this.sun.position.set(6, 12, 6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -9;
    sc.right = 9;
    sc.top = 9;
    sc.bottom = -9;
    sc.near = 1;
    sc.far = 40;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.group.add(this.sun);

    this.buildIsland();
    this.buildProps();
    this.buildClouds();
    this.buildButterfly();

    const starPos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(r(0.05, 1));
      starPos.set([Math.sin(ph) * Math.cos(th) * 70, Math.cos(ph) * 70, Math.sin(ph) * Math.sin(th) * 70], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.group.add(this.stars);

    this.fireflyBase = new Float32Array(36 * 3);
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r(1.5, 6.5);
      this.fireflyBase.set([Math.cos(a) * d, r(0.3, 2.2), Math.sin(a) * d], i * 3);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(this.fireflyBase.slice(), 3));
    this.fireflies = new THREE.Points(
      fg,
      new THREE.PointsMaterial({ color: 0xfff27a, size: 0.14, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.group.add(this.fireflies);

    this.lamp = new THREE.PointLight(0xffc27a, 0, 9, 1.6);
    this.lamp.position.set(4.3, 2.3, 2.6);
    this.group.add(this.lamp);
    this.bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), this.bulbMat);
    bulb.position.copy(this.lamp.position);
    this.group.add(bulb);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8), toon(0x4b3f4f));
    pole.position.set(4.3, 1.1, 2.6);
    pole.castShadow = true;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 8), toon(0x4b3f4f));
    cap.position.set(4.3, 2.5, 2.6);
    this.group.add(pole, cap);

    this.windowMat = new THREE.MeshBasicMaterial({ color: 0x3b2a2a });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36), this.windowMat);
    win.position.set(0, 1.62, 0.76);
    this.barn.add(win);
  }

  private barn = new THREE.Group();

  private buildIsland() {
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(this.islandRadius, this.islandRadius - 0.1, 0.5, 72), toon(0x8fd46b));
    grass.position.y = -0.25;
    grass.receiveShadow = true;
    this.group.add(grass);

    const lip = new THREE.Mesh(new THREE.TorusGeometry(this.islandRadius - 0.05, 0.14, 8, 72), toon(0x7cc35a));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = -0.04;
    this.group.add(lip);

    const dirtGeo = new THREE.CylinderGeometry(this.islandRadius - 0.1, 2.2, 4, 40, 5);
    const pos = dirtGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 1.9) {
        const k = 1 + (Math.random() - 0.5) * 0.18;
        pos.setX(i, pos.getX(i) * k);
        pos.setZ(i, pos.getZ(i) * k);
        pos.setY(i, y + (Math.random() - 0.5) * 0.25);
      }
    }
    dirtGeo.computeVertexNormals();
    const dirt = new THREE.Mesh(dirtGeo, flat(0xb98158));
    dirt.position.y = -2.5;
    this.group.add(dirt);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(this.islandRadius - 0.12, this.islandRadius - 0.6, 0.6, 40), flat(0x9a6844));
    stripe.position.y = -0.8;
    this.group.add(stripe);

    for (let i = 0; i < 5; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r(0.3, 0.7)), flat(0xa37150));
      const a = Math.random() * Math.PI * 2;
      rock.position.set(Math.cos(a) * r(5, 8), r(-5, -3), Math.sin(a) * r(5, 8));
      rock.userData.float = { base: rock.position.y, phase: Math.random() * 6 };
      this.group.add(rock);
    }

    const tuftGeo = new THREE.ConeGeometry(0.05, 0.24, 4);
    tuftGeo.translate(0, 0.12, 0);
    const tufts = new THREE.InstancedMesh(tuftGeo, toon(0xffffff), 260);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    const shades = ['#6fbd4f', '#7fcb5c', '#5eaa45', '#9bd872'];
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * (this.islandRadius - 0.3);
      const s = r(0.6, 1.3);
      m.compose(
        new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(r(-0.25, 0.25), r(0, 6), r(-0.25, 0.25))),
        new THREE.Vector3(s, s, s),
      );
      tufts.setMatrixAt(i, m);
      tufts.setColorAt(i, col.set(shades[i % shades.length]));
    }
    this.group.add(tufts);
  }

  private buildProps() {
    const flowerCols = [0xff8fb1, 0xfff27a, 0xffffff, 0xb69cff, 0xff9d5c];
    const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5);
    const headGeo = new THREE.SphereGeometry(0.07, 10, 8);
    const coreGeo = new THREE.SphereGeometry(0.035, 8, 6);
    for (let i = 0; i < 38; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r(3.2, 6.6);
      const g = new THREE.Group();
      const stem = new THREE.Mesh(stemGeo, toon(0x4f9e3a));
      stem.position.y = 0.15;
      const head = new THREE.Mesh(headGeo, toon(flowerCols[i % flowerCols.length]));
      head.position.y = 0.32;
      head.scale.set(1, 0.6, 1);
      const core = new THREE.Mesh(coreGeo, toon(0xffc93c));
      core.position.y = 0.36;
      g.add(stem, head, core);
      g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      g.userData.sway = Math.random() * 6;
      this.group.add(g);
    }

    const trees: [number, number, number][] = [
      [-5.6, -2.4, 1.1],
      [5.5, -2.8, 1.25],
      [3.4, -5.4, 0.95],
      [-6.1, 1.6, 0.8],
    ];
    for (const [x, z, s] of trees) {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.4, 8), toon(0x8b5a3c));
      trunk.position.y = 0.7;
      t.add(trunk);
      const leafCols = [0x5cb85c, 0x6fcf5f, 0x4fa84f];
      for (const [lx, ly, lz, lr] of [
        [0, 1.8, 0, 0.8],
        [0.45, 1.5, 0.2, 0.55],
        [-0.4, 1.55, -0.1, 0.6],
        [0.05, 2.35, 0.05, 0.5],
      ]) {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(lr, 1), flat(leafCols[Math.floor(Math.random() * 3)]));
        leaf.position.set(lx, ly, lz);
        t.add(leaf);
      }
      t.position.set(x, 0, z);
      t.scale.setScalar(s);
      t.traverse((o) => {
        o.castShadow = true;
      });
      this.group.add(t);
    }

    const barn = this.barn;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.5), toon(0xd9534f));
    walls.position.y = 0.65;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-1.1, 0);
    roofShape.lineTo(0, 0.85);
    roofShape.lineTo(1.1, 0);
    roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1.7, bevelEnabled: false });
    roofGeo.translate(0, 0, -0.85);
    const roof = new THREE.Mesh(roofGeo, toon(0x7a4a3a));
    roof.position.y = 1.3;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), toon(0xfff3e0));
    door.position.set(0, 0.45, 0.76);
    const doorInner = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.78), toon(0xb8403c));
    doorInner.position.set(0, 0.45, 0.765);
    const x1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.02), toon(0xfff3e0));
    x1.position.set(0, 0.45, 0.775);
    x1.rotation.z = 0.62;
    const x2 = x1.clone();
    x2.rotation.z = -0.62;
    barn.add(walls, roof, door, doorInner, x1, x2);
    barn.position.set(-3.5, 0, -5.3);
    barn.rotation.y = 0.55;
    barn.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    this.group.add(barn);

    const postGeo = new THREE.BoxGeometry(0.12, 0.62, 0.12);
    const wood = toon(0xe9d2b0);
    const posts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * 1.1 + (i / 12) * Math.PI * 0.72;
      const p = new THREE.Vector3(Math.cos(a) * 6.55, 0.31, Math.sin(a) * 6.55);
      posts.push(p);
      const post = new THREE.Mesh(postGeo, wood);
      post.position.copy(p);
      post.castShadow = true;
      this.group.add(post);
    }
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];
      const len = a.distanceTo(b);
      for (const y of [0.22, 0.46]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.05), wood);
        rail.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
        rail.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
        rail.castShadow = true;
        this.group.add(rail);
      }
    }

    for (const [x, z, s] of [
      [-4.9, 3.1, 1],
      [-4.5, 3.6, 0.7],
      [5.3, 0.9, 0.85],
      [2.4, -5.9, 0.8],
    ]) {
      const mush = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 10), toon(0xfff3e0));
      stem.position.y = 0.12;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xe8413c));
      cap.position.y = 0.22;
      mush.add(stem, cap);
      for (let i = 0; i < 4; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), toon(0xffffff));
        const a = (i / 4) * Math.PI * 2;
        dot.position.set(Math.cos(a) * 0.12, 0.36, Math.sin(a) * 0.12);
        mush.add(dot);
      }
      mush.position.set(x, 0, z);
      mush.scale.setScalar(s);
      mush.traverse((o) => (o.castShadow = true));
      this.group.add(mush);
    }
  }

  private buildClouds() {
    const mat = toon(0xffffff);
    const geo = new THREE.SphereGeometry(1, 16, 12);
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++) {
        const puff = new THREE.Mesh(geo, mat);
        const s = r(0.9, 1.6);
        puff.scale.set(s * 1.3, s, s);
        puff.position.set((j - n / 2) * 1.2, r(-0.2, 0.4), r(-0.4, 0.4));
        c.add(puff);
      }
      const a = (i / 9) * Math.PI * 2 + r(-0.2, 0.2);
      const d = r(22, 34);
      c.position.set(Math.cos(a) * d, r(5, 13), Math.sin(a) * d);
      c.lookAt(0, c.position.y, 0);
      c.scale.setScalar(r(0.8, 1.4));
      this.clouds.add(c);
    }
    this.group.add(this.clouds);
  }

  private buildButterfly() {
    const wingGeo = new THREE.CircleGeometry(0.12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffa94d, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const pivot = new THREE.Group();
      const w = new THREE.Mesh(wingGeo, mat);
      w.position.x = 0.11 * s;
      w.scale.set(1, 1.3, 1);
      w.rotation.x = -Math.PI / 2;
      pivot.add(w);
      pivot.userData.side = s;
      this.butterfly.add(pivot);
      this.wings.push(pivot);
    }
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.14, 4, 6), toon(0x3a2e39));
    body.rotation.x = Math.PI / 2;
    this.butterfly.add(body);
    this.group.add(this.butterfly);
  }

  get isNight() {
    return this.night > 0.5;
  }

  update(dt: number, t: number, nightTarget: number) {
    this.night += (nightTarget - this.night) * (1 - Math.exp(-1.4 * dt));
    const n = this.night;
    const u = this.sky.uniforms;
    (u.top.value as THREE.Color).copy(DAY.top).lerp(NIGHT.top, n);
    (u.mid.value as THREE.Color).copy(DAY.mid).lerp(NIGHT.mid, n);
    (u.bottom.value as THREE.Color).copy(DAY.bottom).lerp(NIGHT.bottom, n);
    this.fog.color.copy(DAY.mid).lerp(NIGHT.mid, n);
    this.sun.intensity = THREE.MathUtils.lerp(2.3, 0.35, n);
    this.sun.color.setHex(0xfff3dc).lerp(new THREE.Color(0x8fa6ff), n);
    this.hemi.intensity = THREE.MathUtils.lerp(1.5, 0.55, n);
    this.hemi.color.setHex(0xe4f4ff).lerp(new THREE.Color(0x5a6bc4), n);
    (this.stars.material as THREE.PointsMaterial).opacity = n;
    (this.fireflies.material as THREE.PointsMaterial).opacity = n * 0.95;
    this.lamp.intensity = n * 7;
    this.bulbMat.color.setHex(0xe8e0c8).lerp(new THREE.Color(0xfff0a0), n);
    this.windowMat.color.setHex(0x3b2a2a).lerp(new THREE.Color(0xffd27a), n);

    this.clouds.rotation.y += dt * 0.008;
    this.stars.rotation.y += dt * 0.004;

    const fp = this.fireflies.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) {
      const bx = this.fireflyBase[i * 3];
      const by = this.fireflyBase[i * 3 + 1];
      const bz = this.fireflyBase[i * 3 + 2];
      fp.setXYZ(i, bx + Math.sin(t * 0.7 + i) * 0.4, by + Math.sin(t * 1.3 + i * 2) * 0.25, bz + Math.cos(t * 0.6 + i) * 0.4);
    }
    fp.needsUpdate = true;

    this.group.children.forEach((o) => {
      if (o.userData.float) o.position.y = o.userData.float.base + Math.sin(t * 0.6 + o.userData.float.phase) * 0.25;
      if (o.userData.sway !== undefined) o.rotation.z = Math.sin(t * 1.5 + o.userData.sway) * 0.08;
    });

    const bx = Math.sin(t * 0.23) * 3.6 + Math.sin(t * 0.61) * 0.8;
    const bz = Math.cos(t * 0.19) * 2.6 + Math.sin(t * 0.47) * 0.6;
    const by = 1.7 + Math.sin(t * 1.7) * 0.35 + Math.sin(t * 0.5) * 0.3;
    const prev = this.butterfly.position.clone();
    this.butterfly.position.set(bx, by, bz);
    const dx = bx - prev.x;
    const dz = bz - prev.z;
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) this.butterfly.rotation.y = Math.atan2(dx, dz);
    const flap = Math.sin(t * 22) * 0.9;
    for (const w of this.wings) w.rotation.z = flap * (w.userData.side as number);
    this.butterfly.visible = n < 0.5;
  }
}
