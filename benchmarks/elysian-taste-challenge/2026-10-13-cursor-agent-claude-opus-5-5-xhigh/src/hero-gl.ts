import { clamp, damp, easeOutExpo, lerp } from "./utils";

const TRAIL = 16;

const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
#define TRAIL ${TRAIL}
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec2 uFocus;
uniform vec2 uPar;
uniform float uTime;
uniform float uReveal;
uniform float uDpr;
uniform vec3 uTrail[TRAIL];
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}
vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y;
  float ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  return uv * s + (1.0 - s) * uFocus;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 css = frag / uDpr;
  float aspect = uRes.x / uRes.y;

  float n = fbm(css * 0.0065 + vec2(uTime * 0.05, -uTime * 0.035));
  float n2 = noise(css * 0.035 + vec2(0.0, -uTime * 0.6));

  // lantern: a comet of soft discs with a ragged, smouldering rim
  float m = 0.0;
  for (int i = 0; i < TRAIL; i++) {
    vec3 t = uTrail[i];
    if (t.z > 0.5) {
      float d = length(frag - t.xy) / t.z;
      d += (n - 0.5) * 0.6 + (n2 - 0.5) * 0.14;
      m = max(m, 1.0 - smoothstep(0.62, 1.0, d));
    }
  }

  // scroll: the whole plate burns through to colour, from the centre outward
  if (uReveal > 0.001) {
    vec2 q = (vUv - 0.5) * vec2(aspect, 1.0);
    float field = fbm(vUv * vec2(aspect, 1.0) * 2.4 + 3.7) * 0.75 + length(q) * 0.42;
    float T = mix(-0.05, 1.25, uReveal);
    m = max(m, 1.0 - smoothstep(T - 0.05, T + 0.05, field + (n2 - 0.5) * 0.05));
  }

  float edge = pow(clamp(4.0 * m * (1.0 - m), 0.0, 1.0), 2.5);

  vec3 h = uTrail[0];
  vec2 dv = (frag - h.xy) / max(h.z, 1.0);
  float fall = exp(-dot(dv, dv) * 1.6) * step(0.5, h.z);
  vec2 uv = vUv - (frag - h.xy) / uRes * 0.05 * fall;

  float zoom = 0.94 + 0.012 * sin(uTime * 0.13);
  uv = (uv - 0.5) * zoom + 0.5 + uPar * vec2(0.014, 0.01);
  vec2 tuv = cover(uv);
  vec2 ca = (frag - h.xy) / uRes * 0.008 * (edge + fall * 0.3);
  vec3 col;
  col.r = texture2D(uTex, tuv + ca).r;
  col.g = texture2D(uTex, tuv).g;
  col.b = texture2D(uTex, tuv - ca).b;

  // engraving: luminance drives line weight, tone bends the burin
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float l = pow(lum, 1.1);
  vec2 dir = vec2(0.7071, 0.7071);
  float sp = 3.4;
  float ph = dot(css, dir) / sp + l * 2.6 + n * 2.0;
  float w = 0.5 + 0.5 * sin(ph * 6.2831853);
  float lines = smoothstep(w - 0.22, w + 0.22, l * 1.12);
  float ph2 = dot(css, vec2(-dir.y, dir.x)) / (sp * 1.25) + l * 1.8;
  float w2 = 0.5 + 0.5 * sin(ph2 * 6.2831853);
  float hatch = smoothstep(w2 - 0.25, w2 + 0.25, (l - 0.5) * 2.2);
  float ink = clamp(lines * 0.82 + hatch * 0.4, 0.0, 1.0);
  vec3 bg = vec3(0.043, 0.09, 0.11);
  vec3 lc = mix(vec3(0.66, 0.76, 0.77), col, 0.22);
  vec3 etched = mix(bg, lc, ink);

  vec3 color = mix(etched, col * 1.03, m);
  color += vec3(1.0, 0.55, 0.16) * edge * 0.95;
  color = mix(color, vec3(1.0, 0.9, 0.65), pow(edge, 3.0) * 0.55);

  float vig = smoothstep(1.25, 0.35, length((vUv - 0.5) * vec2(1.0, 1.15)));
  color *= mix(0.62, 1.0, vig);
  color += (hash(frag + fract(uTime * 7.0) * 91.0) - 0.5) * 0.035;
  gl_FragColor = vec4(color, 1.0);
}`;

type Options = { coarse: boolean; reduced: boolean };

export class HeroGL {
  private gl: WebGLRenderingContext;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private trail = new Float32Array(TRAIL * 3);
  private pts = Array.from({ length: TRAIL }, () => ({ x: 0, y: 0 }));
  private target = { x: 0, y: 0 };
  private par = { x: 0, y: 0, tx: 0, ty: 0 };
  private lastInput = -1e9;
  private igniteStart = -1;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private imgSize = { w: 1, h: 1 };
  reveal = 0;
  active = true;

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    private opts: Options,
  ) {
    this.gl = gl;
  }

  static async create(canvas: HTMLCanvasElement, src: string, opts: Options) {
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return null;
    const hero = new HeroGL(canvas, gl, opts);
    if (!hero.compile()) return null;
    await hero.load(src);
    hero.bind();
    return hero;
  }

  private compile() {
    const { gl } = this;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    for (const name of ["uTex", "uRes", "uImg", "uFocus", "uPar", "uTime", "uReveal", "uDpr", "uTrail"]) {
      this.u[name] = gl.getUniformLocation(prog, name);
    }
    return true;
  }

  private async load(src: string) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    await img.decode();
    const { gl } = this;
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.u.uTex, 0);
    this.imgSize = { w: img.naturalWidth, h: img.naturalHeight };
  }

  private bind() {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.pts.forEach((p) => {
      p.x = this.w / 2;
      p.y = this.h * 0.5;
    });
    this.target = { x: this.w / 2, y: this.h * 0.5 };

    const stage = this.canvas.parentElement!;
    const setFrom = (clientX: number, clientY: number) => {
      const r = this.canvas.getBoundingClientRect();
      this.target.x = clientX - r.left;
      this.target.y = clientY - r.top;
      this.par.tx = (this.target.x / this.w) * 2 - 1;
      this.par.ty = (this.target.y / this.h) * 2 - 1;
      this.lastInput = performance.now();
    };
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      setFrom(e.clientX, e.clientY);
    });
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setFrom(t.clientX, t.clientY);
    };
    stage.addEventListener("touchstart", onTouch, { passive: true });
    stage.addEventListener("touchmove", onTouch, { passive: true });

    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.active = false;
      stage.parentElement?.classList.add("hero--nogl");
    });
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.opts.coarse ? 1.5 : 1.6);
    this.w = this.canvas.clientWidth || window.innerWidth;
    this.h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  ignite() {
    this.igniteStart = performance.now();
  }

  frame(time: number, dt: number) {
    if (!this.active) return;
    const { gl, w, h, dpr, opts } = this;
    const t = time / 1000;

    const idle = time - this.lastInput > (opts.coarse ? 2600 : 4200);
    if (idle && !opts.reduced) {
      this.target.x = w * (0.5 + 0.3 * Math.sin(t * 0.37));
      this.target.y = h * (0.47 + 0.17 * Math.sin(t * 0.53 + 1.3));
      this.par.tx = Math.sin(t * 0.21) * 0.4;
      this.par.ty = Math.cos(t * 0.17) * 0.3;
    }

    const head = this.pts[0];
    const prevX = head.x;
    const prevY = head.y;
    const kHead = damp(idle ? 0.05 : 0.16, dt);
    head.x = lerp(head.x, this.target.x, kHead);
    head.y = lerp(head.y, this.target.y, kHead);
    const speed = Math.hypot(head.x - prevX, head.y - prevY) / Math.max(dt * 60, 0.5);
    const kTail = damp(0.38, dt);
    for (let i = 1; i < TRAIL; i++) {
      const p = this.pts[i];
      const q = this.pts[i - 1];
      p.x = lerp(p.x, q.x, kTail);
      p.y = lerp(p.y, q.y, kTail);
    }

    const ig = this.igniteStart < 0 ? 0 : easeOutExpo(clamp((time - this.igniteStart) / 1800));
    const base = Math.min(w, h) * (opts.coarse ? 0.34 : 0.24) * (1 + 0.05 * Math.sin(t * 1.3));
    const R = base * ig * (1 + Math.min(speed / 70, 0.3));
    for (let i = 0; i < TRAIL; i++) {
      const p = this.pts[i];
      const f = Math.pow(1 - i / TRAIL, 1.15);
      this.trail[i * 3] = p.x * dpr;
      this.trail[i * 3 + 1] = (h - p.y) * dpr;
      this.trail[i * 3 + 2] = R * f * dpr;
    }

    const kp = damp(0.06, dt);
    this.par.x = lerp(this.par.x, this.par.tx, kp);
    this.par.y = lerp(this.par.y, this.par.ty, kp);

    const portrait = w / h < 1;
    const fx = portrait && !opts.reduced ? 0.55 + 0.3 * Math.sin(t * 0.11) : 0.5;

    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uImg, this.imgSize.w, this.imgSize.h);
    gl.uniform2f(this.u.uFocus, fx, 0.5);
    gl.uniform2f(this.u.uPar, this.par.x, -this.par.y);
    gl.uniform1f(this.u.uTime, t);
    gl.uniform1f(this.u.uReveal, this.reveal);
    gl.uniform1f(this.u.uDpr, dpr);
    gl.uniform3fv(this.u.uTrail, this.trail);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
