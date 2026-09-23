// all the way down — v7, "the codebase"
//
// A flight through a building made of source code. Every surface is typeset from this file's own
// text, so up close you can read it and from a distance it turns to engraving-dense hatching.
// The building assembles itself just ahead of the camera, in the order work moves through bb:
// far ahead it is only a blue plan, then blank slabs fly in and lock into place, then agents
// (points of light) type them line by line. Fresh lines glow warm and cool to ink, and a finished
// slab's edges flash green. The route runs from a canyon of code into a hall of twisting towers
// and back. Everything is periodic in 45 s: the camera travels exactly one period of the
// structure, and every slab's state depends only on its distance ahead of the camera.

export const DURATION = 45;
const T = DURATION, P = 80, TAU = Math.PI * 2;

const CANVAS = [0.082, 0.082, 0.082], INK = [0.757, 0.757, 0.757];
const BLUE = [0.475, 0.663, 0.859], GREEN = [0.294, 0.776, 0.502], SPARK = [0.988, 0.549, 0.271];
const LP = 0.045; // world height of one line of code

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// ---------------------------------------------------------------------------------------------
// Camera: one period of the structure per loop.

export function camera(t) {
  const w = (TAU * t) / T, p = t / T;
  // in the hall the camera dives, looking down into it, then climbs back out
  const hy = (q) => -7 * hallAt(q);
  const slope = (hy(p + 0.002) - hy(p - 0.002)) / (0.004 * P);
  const hw = hallAt(p);
  return {
    z: P * p,
    x: 0.9 * Math.sin(2 * w + 1.0),
    y: 2.2 * Math.sin(w + 0.5) + 0.7 * Math.sin(3 * w + 2.0) + hy(p),
    yaw: 0.2 * Math.sin(w + 2.2) + 0.07 * Math.sin(3 * w + 0.3) + 0.35 * hw * Math.sin(3 * w + 1.3),
    pitch: 0.08 * Math.sin(2 * w + 0.4) + 0.04 * Math.sin(w + 3.0) - 0.02 + 0.8 * Math.atan(slope) - 0.12 * hw,
    roll: 0.07 * Math.sin(w + 4.0),
  };
}
const phaseOf = (z) => (((z % P) + P) % P) / P;
const camAtZ = (z) => camera(T * phaseOf(z));
// The corridor opens into a hall of towers for part of each period.
const hallAt = (p) => { p = ((p % 1) + 1) % 1; return smooth(0.36, 0.5, p) * (1 - smooth(0.78, 0.92, p)); };
const hall = (z) => hallAt(phaseOf(z));
const halfWidth = (z) => 4.6 + 60 * hall(z);

// ---------------------------------------------------------------------------------------------
// The structure: one period of slabs. Faces: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z.

function buildWorld(seed) {
  const R = mulberry32(seed * 7919 + 1);
  const slabs = [];
  const add = (o) => slabs.push(o);

  // canyon walls, three layers deep
  for (const side of [-1, 1]) for (let L = 0; L < 3; L++) {
    let z = R() * 0.5;
    while (z < P - 0.3) {
      const wz = Math.min(0.6 + R() * R() * 3.4, P - z);
      const zc = z + wz / 2;
      const W = halfWidth(zc) + L * 3.4 + R() * 0.6;
      let y = -34 - R() * 2;
      while (y < 34) {
        const hy = 0.25 + R() * R() * 2.6;
        if (R() > (L === 0 ? 0.12 : 0.25)) {
          const depth = 0.3 + R() * 1.6, prot = R() * R() * 0.9;
          add({ kind: 0, c: [side * (W - prot + depth / 2), y + hy / 2, zc], s: [depth, hy - 0.05, wz - 0.05], yaw: 0, face: side > 0 ? 1 : 0, side });
        }
        y += hy;
      }
      z += wz;
    }
  }

  // hall towers: stacks of slabs that twist as they rise
  const towers = [];
  for (let i = 0; i < 1500 && towers.length < 44; i++) {
    const z = P * (0.44 + R() * 0.4), W = halfWidth(z);
    if (W < 12) continue;
    const x = (R() < 0.5 ? -1 : 1) * (4.5 + R() * Math.min(W - 7, 40));
    const fp = 1.5 + R() * R() * 7.5;
    const cam = camAtZ(z);
    if (Math.abs(x - cam.x) < fp + 5) continue;
    if (towers.some((t) => Math.hypot(t.x - x, t.z - z) < (t.fp + fp) * 0.9)) continue;
    towers.push({ x, z, fp });
    const twist = (R() - 0.5) * 0.09, yaw0 = R() * TAU;
    let y = -44 - R() * 3, lvl = 0;
    const top = 10 + R() * 34;
    while (y < top) {
      const h = 0.2 + R() * R() * 1.5;
      add({ kind: 1, c: [x, y + h / 2, z], s: [fp * (0.7 + R() * 0.5), h - 0.05, fp * (0.6 + R() * 0.6)], yaw: yaw0 + lvl * twist, face: 5 });
      y += h; lvl++;
    }
  }

  // bridges across the corridor, clear of the camera's path
  for (let i = 0; i < 46; i++) {
    const dz = 0.4 + R() * 1.8;
    const z = dz + R() * (P - 2 * dz), cam = camAtZ(z), W = halfWidth(z);
    if (R() < 0.85 * hall(z)) continue; // the hall stays open
    let y = (R() - 0.5) * 44;
    if (Math.abs(y - cam.y) < 3.2) y = cam.y + Math.sign(y - cam.y || 1) * (3.2 + R() * 3);
    const th = 0.25 + R() * 0.9;
    let x = -W - 0.5;
    while (x < W + 0.5) {
      const len = 0.6 + R() * 2.2;
      add({ kind: 2, c: [x + len / 2, y, z], s: [len - 0.05, th, dz], yaw: 0, face: y > cam.y ? 3 : 5 });
      x += len;
    }
  }

  for (const o of slabs) {
    const fs = 50 + R() * 45, fe = fs - (8 + R() * 14);
    const ws = Math.min(fe - 1, 5 + R() * 44), we = ws - (5 + R() * 14);
    o.tim = [fs, fe, ws, we];
    const up = R() < 0.5 ? -1 : 1;
    o.fly = o.kind === 0 ? [o.side * (6 + R() * 18), (R() - 0.5) * 26, (R() - 0.3) * 12]
      : o.kind === 1 ? [(R() - 0.5) * 6, up * (15 + R() * 25), (R() - 0.5) * 6]
      : [(R() - 0.5) * 10, up * (8 + R() * 15), (R() - 0.5) * 8];
    o.spin = (R() - 0.5) * 3;
    o.line0 = R();
    o.agent = R() < 0.3 ? 1 : 0;
  }
  return slabs;
}

// ---------------------------------------------------------------------------------------------
// Code atlas: this file, syntax-split into channels. R plain ink, G keywords, B strings and numbers.

const KW = new Set('const let var function return if else for of in while new export async await import from this true false null break continue class extends uniform out vec2 vec3 vec4 float int mat3 mat4 void flat precision highp'.split(' '));
function tokens(s) {
  const out = [];
  const re = /(\/\/.*$)|('(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?|"(?:[^"\\]|\\.)*"?)|(\d+(?:\.\d+)?(?:e-?\d+)?)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(s))) {
    const cls = m[1] ? 'com' : m[2] ? 'str' : m[3] ? 'num' : m[4] ? (KW.has(m[4]) ? 'kw' : 'id') : m[5] ? 'ws' : 'p';
    out.push([m[0], cls]);
  }
  return out;
}
const TOKEN_FILL = { id: 'rgb(255,0,0)', p: 'rgb(150,0,0)', com: 'rgb(110,0,0)', kw: 'rgb(0,255,0)', str: 'rgb(0,0,255)', num: 'rgb(0,0,230)' };

async function makeAtlas(gl) {
  const src = await (await fetch(new URL('./film.js', import.meta.url))).text();
  const code = src.split('\n').map((l) => l.replace(/\t/g, '  ').replace(/\s+$/, '')).filter((l) => l.trim().length);
  // 32px glyphs so text stays crisp when the camera passes close; half size if the GPU can't hold it
  const K = gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 16384 ? 2 : 1;
  const W = 8192 * K, H = 4096 * K, LH = 20 * K, COLCH = 92;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.font = `${16 * K}px Menlo, "SF Mono", Monaco, monospace`;
  ctx.textBaseline = 'middle';
  const CWp = ctx.measureText('M').width;
  const colW = Math.ceil((COLCH + 6) * CWp);
  const perCol = Math.floor(H / LH), blocks = Math.floor(W / colW), total = perCol * blocks;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < total; i++) {
    const text = code[i % code.length].slice(0, COLCH);
    const b = Math.floor(i / perCol), r = i % perCol;
    let col = 0;
    for (const [tok, cls] of tokens(text)) {
      if (cls !== 'ws') { ctx.fillStyle = TOKEN_FILL[cls]; ctx.fillText(tok, b * colW + col * CWp, r * LH + LH / 2 + K); }
      col += tok.length;
    }
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return { tex, at: [W, H, LH, CWp], at2: [colW, perCol, total, COLCH] };
}

// ---------------------------------------------------------------------------------------------
// Shaders

const INSTANCE = `
layout(location=2) in vec3 iC;
layout(location=3) in vec3 iS;
layout(location=4) in vec2 iRot;
layout(location=5) in vec4 iFly;
layout(location=6) in vec4 iTim;
layout(location=7) in vec4 iMisc;
uniform mat4 uVP;
uniform float uCamZ;
uniform vec3 uCamPos;
uniform float uFogDist;
const float TAU_ = 6.2831853;
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
float ease(float x) { x = clamp(x, 0., 1.); return 1. - pow(1. - x, 3.); }
float flight(float d) { return clamp((iTim.x - d) / (iTim.x - iTim.y), 0., 1.); }
float written(float d) { return clamp((iTim.z - d) / (iTim.z - iTim.w), 0., 1.); }
float fogAt(float dist) { return 1. - exp(-pow(dist / uFogDist, 1.35)); }
`;

// Face layout shared by the slab shader (which draws text) and the agent shader (which finds the
// write head). u runs left to right as read from outside the face, v runs up.
const FACE = `
uniform float uLP;
uniform vec4 uAt;   // atlas w, h, line px, char px
uniform vec4 uAt2;  // column px, lines per column, total lines, chars per column
vec3 faceNormal(int f) { return f == 0 ? vec3(1,0,0) : f == 1 ? vec3(-1,0,0) : f == 2 ? vec3(0,1,0) : f == 3 ? vec3(0,-1,0) : f == 4 ? vec3(0,0,1) : vec3(0,0,-1); }
vec2 faceSize(vec3 n, vec3 s) { return abs(n.x) > .5 ? s.zy : abs(n.z) > .5 ? s.xy : s.xz; }
vec2 faceUV(vec3 n, vec3 lp) { return abs(n.x) > .5 ? vec2(-n.x * lp.z, lp.y) : abs(n.z) > .5 ? vec2(n.z * lp.x, lp.y) : vec2(lp.x, -n.y * lp.z); }
vec3 faceLocal(vec3 n, vec3 s, vec2 uv) {
  if (abs(n.x) > .5) return vec3(n.x * s.x * .5, uv.y, -n.x * uv.x);
  if (abs(n.z) > .5) return vec3(n.z * uv.x, uv.y, n.z * s.z * .5);
  return vec3(uv.x, n.y * s.y * .5, -n.y * uv.y);
}
float CW() { return uLP * uAt.w / uAt.z; }
float PAD() { return 0.05 + uLP; }
float SPAN() { return uAt2.w * CW() + 3. * CW(); }
// rows per column, columns
vec2 layout2(vec2 fs) {
  float rows = max(0., floor((fs.y - 2. * PAD()) / uLP));
  float cols = max(1., floor((fs.x - 2. * PAD() + 3. * CW()) / SPAN()));
  return vec2(rows, cols);
}
// write head, measured from the face's left and top, for progress b
vec2 headAt(vec2 fs, float b) {
  vec2 lc = layout2(fs);
  float h = b * lc.x * lc.y, g = min(floor(h), lc.x * lc.y - 1.);
  float k = floor(g / max(lc.x, 1.)), r = g - k * lc.x;
  float ch = b >= 1. ? uAt2.w : (h - floor(h)) * uAt2.w;
  return vec2(PAD() + k * SPAN() + ch * CW(), PAD() + (r + .5) * uLP);
}
`;

const SLAB_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
${INSTANCE}
out vec3 vLocal;
out vec3 vWorld;
flat out vec3 vN;
flat out vec3 vNW;
flat out vec3 vS;
flat out vec4 vTim;
flat out vec4 vMisc;
flat out vec2 vDB;
flat out float vFlight;
void main() {
  float d = iC.z - uCamZ;
  float f = flight(d);
  if (f <= 0.) { gl_Position = vec4(2., 2., 2., 1.); return; }
  float e = ease(f);
  mat3 R = rotY(iRot.x + iRot.y * (1. - e) * (1. - e));
  vec3 lp = aPos * iS;
  vec3 wp = iC + iFly.xyz * (1. - e) + R * lp;
  vLocal = lp; vWorld = wp; vN = aNrm; vNW = R * aNrm; vS = iS; vTim = iTim; vMisc = iMisc;
  vDB = vec2(d, written(d)); vFlight = f;
  gl_Position = uVP * vec4(wp, 1.);
}`;

const SKY = `
uniform vec3 uCanvas;
uniform vec3 uGlowDir;
vec3 sky(vec3 vd) {
  float g = max(dot(vd, uGlowDir), 0.);
  vec3 c = uCanvas * (0.9 + 0.2 * smoothstep(-0.6, 0.6, vd.y));
  return c * 0.75 + vec3(0.3, 0.31, 0.33) * pow(g, 9.) + vec3(0.045) * pow(g, 2.5);
}
`;

const SLAB_FS = `#version 300 es
precision highp float;
in vec3 vLocal;
in vec3 vWorld;
flat in vec3 vN;
flat in vec3 vNW;
flat in vec3 vS;
flat in vec4 vTim;
flat in vec4 vMisc;
flat in vec2 vDB;
flat in float vFlight;
uniform sampler2D uAtlas;
uniform vec3 uCamPos;
uniform float uFogDist;
uniform vec3 uInk, uBlue, uGreen, uSpark;
${SKY}
${FACE}
out vec4 o;
void main() {
  vec3 n = vN;
  vec2 fs = faceSize(n, vS);
  vec2 uv = faceUV(n, vLocal);
  float uL = uv.x + fs.x * .5, vT = fs.y * .5 - uv.y;
  vec2 lc = layout2(fs);
  float cw = CW(), pad = PAD(), span = SPAN();
  float x = uL - pad, y = vT - pad;
  float k = floor(x / span), cx = x - k * span;
  float rowF = y / uLP, row = floor(rowF), charF = cx / cw;
  bool inText = x >= 0. && y >= 0. && k < lc.y && row < lc.x && charF < uAt2.w;

  float faceId = dot(abs(n), vec3(1., 2., 3.)) + (dot(n, vec3(1.)) > 0. ? 3. : 0.);
  float g = k * lc.x + row;
  float line = mod(floor(vMisc.x * uAt2.z) + faceId * 211. + g, uAt2.z);
  float block = floor(line / uAt2.y), lr = line - block * uAt2.y;
  vec2 px = vec2(block * uAt2.x + charF * uAt.w, lr * uAt.z + fract(rowF) * uAt.z);
  vec2 pc = vec2(uL / cw * uAt.w, vT / uLP * uAt.z);
  vec2 dx = dFdx(pc) / uAt.xy, dy = dFdy(pc) / uAt.xy;
  vec4 tx = textureGrad(uAtlas, px / uAt.xy, dx, dy);
  if (!inText) tx = vec4(0.);

  // typing
  float b = vDB.y, G = lc.x * lc.y, h = b * G;
  float shown = g < floor(h) ? 1. : (g == floor(h) ? step(charF, fract(h) * uAt2.w) : 0.);
  if (b >= 1.) shown = 1.;
  float age = h - g - charF / uAt2.w;
  float warm = shown * exp(-max(age, 0.) / 2.2) * (b < 1. ? 1. : exp(-max(vTim.w - vDB.x, 0.) / 1.5));

  vec3 L = normalize(vec3(0.35, 0.8, 0.45));
  float lam = max(dot(vNW, L), 0.);
  float shade = 0.3 + 0.7 * lam;
  vec3 fill = mix(uCanvas * 0.7, uInk, 0.02 + 0.15 * shade * shade);
  float a = shown * (1.1 + 0.5 * shade);
  vec3 kwc = mix(uInk, uBlue, 0.6), strc = mix(uInk, uGreen, 0.5);
  vec3 txt = uInk * tx.r + kwc * tx.g + strc * tx.b;
  txt = mix(txt, uSpark * 1.25 * (tx.r + tx.g + tx.b), warm);
  float cov = min(tx.r + tx.g + tx.b, 1.);
  vec3 col = fill * (1. - cov * a) + txt * a;

  // cursor
  if (b > 0. && b < 1.) {
    vec2 hd = headAt(fs, b);
    vec2 q = vec2(uL, vT) - hd;
    float cell = step(abs(q.x - cw * .5), cw * .5) * step(abs(q.y), uLP * .5);
    col += uSpark * (exp(-dot(q, q) / (0.035 * 0.035)) * 0.7 + cell * 1.6);
  }

  // edges, flashing green when the slab is finished
  float de = min(fs.x * .5 - abs(uv.x), fs.y * .5 - abs(uv.y));
  float fw = length(vec2(dFdx(de), dFdy(de)));
  float edge = 1. - smoothstep(0., 1.25 * fw, de);
  float flash = b >= 1. ? exp(-max(vTim.w - vDB.x, 0.) / 1.2) : 0.;
  vec3 ecol = mix(uInk * (0.4 + 0.3 * shade), uGreen * 1.7, flash);
  col = mix(col, ecol, edge * (0.45 + 0.5 * flash));
  col += uGreen * flash * 0.06;
  // a slab in flight is still a bare, bright block
  col = mix(col, mix(uCanvas, uInk, 0.25 + 0.2 * shade), (1. - smoothstep(0.7, 1., vFlight)) * 0.6);

  vec3 V = vWorld - uCamPos;
  float dist = length(V);
  float fog = 1. - exp(-pow(dist / uFogDist, 1.35));
  o = vec4(mix(col, sky(V / dist), fog), 1.);
}`;

const PLAN_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
${INSTANCE}
uniform float uPlan;
out float vA;
void main() {
  float d = iC.z - uCamZ;
  float f = flight(d);
  vec3 wp = iC + rotY(iRot.x) * (aPos * iS);
  float a = (1. - smoothstep(0.75, 1., f)) * (1. - smoothstep(100., 130., d)) * smoothstep(-2., 8., d);
  a *= 1. + 2.5 * exp(-pow((f - 0.9) / 0.06, 2.));
  float fog = fogAt(length(wp - uCamPos) * 0.8);
  vA = a * uPlan * (1. - fog);
  gl_Position = vA > 0.0005 ? uVP * vec4(wp, 1.) : vec4(2., 2., 2., 1.);
}`;

const PLAN_FS = `#version 300 es
precision highp float;
uniform vec3 uBlue;
in float vA;
out vec4 o;
void main() { o = vec4(uBlue * vA, 1.); }`;

const AGENT_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
${INSTANCE}
${FACE}
uniform vec3 uCR, uCU;
uniform float uTime;
out vec2 vC;
out float vI;
void main() {
  gl_Position = vec4(2., 2., 2., 1.);
  vC = aCorner; vI = 0.;
  if (iMisc.y < .5) return;
  float d = iC.z - uCamZ;
  float f = flight(d);
  if (f <= 0.) return;
  float e = ease(f);
  mat3 R = rotY(iRot.x + iRot.y * (1. - e) * (1. - e));
  vec3 n = faceNormal(int(iMisc.z + .5));
  vec2 fs = faceSize(n, iS);
  float b = written(d);
  vec2 hd = headAt(fs, b);
  vec3 lp = faceLocal(n, iS, vec2(hd.x - fs.x * .5, fs.y * .5 - hd.y)) + n * 0.03;
  vec3 pos = iC + iFly.xyz * (1. - e) + R * lp;
  float seed = iMisc.w, I;
  if (f < 1.) I = 0.9;
  else if (b <= 0.) I = 0.55 + 0.25 * sin(TAU_ * (uTime / 45. * 18. + seed));
  else if (b < 1.) I = 1. + 0.25 * sin(TAU_ * (uTime / 45. * 37. + seed));
  else {
    float a = iTim.w - d;
    I = exp(-a / 1.6);
    pos += (R * n) * a * 0.5 + vec3(0., a * 0.35, a * 0.2);
  }
  I *= 1. - fogAt(length(pos - uCamPos));
  if (I < 0.003) return;
  vI = I;
  gl_Position = uVP * vec4(pos + (uCR * aCorner.x + uCU * aCorner.y) * 0.28, 1.);
}`;

const AGENT_FS = `#version 300 es
precision highp float;
uniform vec3 uSpark;
in vec2 vC;
in float vI;
out vec4 o;
void main() {
  float r2 = dot(vC, vC);
  if (r2 > 1.) discard;
  float core = exp(-r2 * 160.), halo = exp(-r2 * 30.) * 0.45 + exp(-r2 * 6.) * 0.16;
  o = vec4((uSpark * (core * 2. + halo) + vec3(1.) * core * 0.9) * vI, 1.);
}`;

const FULL_VS = `#version 300 es
out vec2 vN;
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vN = p * 2. - 1.; gl_Position = vec4(p * 2. - 1., 1., 1.); }`;
const SKY_FS = `#version 300 es
precision highp float;
in vec2 vN;
uniform vec3 uCR, uCU, uCF;
uniform vec2 uTan;
${SKY}
out vec4 o;
void main() { o = vec4(sky(normalize(uCF + vN.x * uTan.x * uCR + vN.y * uTan.y * uCU)), 1.); }`;

const COMP_FS = `#version 300 es
precision highp float;
in vec2 vN;
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uFrame;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 e = 0.25 / uRes;
  vec3 c = (texture(uSrc, uv + vec2(-e.x, -e.y)).rgb + texture(uSrc, uv + vec2(e.x, -e.y)).rgb
          + texture(uSrc, uv + vec2(-e.x, e.y)).rgb + texture(uSrc, uv + vec2(e.x, e.y)).rgb) * 0.25;
  vec2 q = (uv - 0.5) * vec2(1., 0.8);
  c *= 1. - 0.3 * pow(length(q) * 1.35, 2.4);
  c = pow(c * 1.3, vec3(1.18));
  c += (hash(gl_FragCoord.xy + fract(uFrame * 0.618) * 97.) - 0.5) * 0.02;
  o = vec4(clamp(c, 0., 1.), 1.);
}`;

// ---------------------------------------------------------------------------------------------

function cubeMesh() {
  const pos = [], nrm = [], idx = [];
  for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const [u, v] = n[0] ? [[0, 1, 0], [0, 0, 1]] : n[1] ? [[1, 0, 0], [0, 0, 1]] : [[1, 0, 0], [0, 1, 0]];
    const base = pos.length / 3;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      for (let i = 0; i < 3; i++) pos.push(n[i] * 0.5 + u[i] * su * 0.5 + v[i] * sv * 0.5);
      nrm.push(...n);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint16Array(idx) };
}
function cubeEdges() {
  const c = [];
  for (let i = 0; i < 8; i++) c.push((i & 1) - 0.5, ((i >> 1) & 1) - 0.5, ((i >> 2) & 1) - 0.5);
  const e = [];
  for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) e.push(i, i | b);
  return { pos: new Float32Array(c), idx: new Uint16Array(e) };
}

export async function createFilm(canvas, { seed = 7, preserve = false, debug = {} } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: preserve, alpha: false });
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float missing');
  const mk = (type, src) => {
    const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const program = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = new Proxy({}, { get: (c, k) => (k in c ? c[k] : (c[k] = gl.getUniformLocation(p, k))) });
    return { p, u };
  };
  const slabP = program(SLAB_VS, SLAB_FS), planP = program(PLAN_VS, PLAN_FS), agentP = program(AGENT_VS, AGENT_FS);
  const skyP = program(FULL_VS, SKY_FS), compP = program(FULL_VS, COMP_FS);

  const atlas = await makeAtlas(gl);
  debug.log?.(`atlas ${atlas.at.join(',')} ${atlas.at2.join(',')}`);

  // instances: one period, repeated four times along z
  const slabs = buildWorld(seed);
  const COPIES = [-1, 0, 1, 2], STRIDE = 20;
  const N = slabs.length * COPIES.length;
  const data = new Float32Array(N * STRIDE);
  let j = 0;
  for (const k of COPIES) for (const [i, o] of slabs.entries()) {
    data.set([o.c[0], o.c[1], o.c[2] + k * P, ...o.s, o.yaw, o.spin, ...o.fly, 0, ...o.tim, o.line0, o.agent, o.face, (i * 0.618) % 1], j);
    j += STRIDE;
  }
  debug.log?.(`slabs ${slabs.length} instances ${N}`);
  const vbo = (arr, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, arr, gl.STATIC_DRAW); return b; };
  const ibuf = vbo(data);
  const bindInstances = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
    for (const [loc, size, off] of [[2, 3, 0], [3, 3, 3], [4, 2, 6], [5, 4, 8], [6, 4, 12], [7, 4, 16]]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
  };

  const cube = cubeMesh();
  const slabVao = gl.createVertexArray();
  gl.bindVertexArray(slabVao);
  vbo(cube.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  vbo(cube.nrm); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  vbo(cube.idx, gl.ELEMENT_ARRAY_BUFFER);
  bindInstances();

  const edges = cubeEdges();
  const planVao = gl.createVertexArray();
  gl.bindVertexArray(planVao);
  vbo(edges.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  vbo(edges.idx, gl.ELEMENT_ARRAY_BUFFER);
  bindInstances();

  const agentVao = gl.createVertexArray();
  gl.bindVertexArray(agentVao);
  vbo(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1])); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  bindInstances();
  const emptyVao = gl.createVertexArray();
  gl.bindVertexArray(null);

  // multisampled float scene buffer at an internal supersampled size, filtered down at the end
  const W = canvas.width, H = canvas.height, SS = debug.ss ?? 1.5;
  const SW = Math.round(W * SS), SH = Math.round(H * SS);
  const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
  const msFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
  const crb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, crb);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA16F, SW, SH);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, crb);
  const drb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, drb);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, SW, SH);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, drb);
  const resTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, resTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, SW, SH);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const resFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, resFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, resTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const FOV = (64 * Math.PI) / 180, NEAR = 0.05, FAR = 400;
  const fogDist = debug.fog ?? 62, planAlpha = debug.plan ?? 0.2;
  let frame = 0;

  function render(t, { target = null } = {}) {
    const c = camera(t);
    const cp = Math.cos(c.pitch);
    const f = [Math.sin(c.yaw) * cp, Math.sin(c.pitch), Math.cos(c.yaw) * cp];
    let r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r); r = r.map((v) => v / rl);
    const u0 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
    const R = r.map((v, i) => v * cr + u0[i] * sr), U = u0.map((v, i) => v * cr - r[i] * sr);
    const e = [c.x, c.y, c.z];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const view = [R[0], U[0], -f[0], 0, R[1], U[1], -f[1], 0, R[2], U[2], -f[2], 0, -dot(R, e), -dot(U, e), dot(f, e), 1];
    const asp = W / H, ft = 1 / Math.tan(FOV / 2);
    const proj = [ft / asp, 0, 0, 0, 0, ft, 0, 0, 0, 0, (FAR + NEAR) / (NEAR - FAR), -1, 0, 0, (2 * FAR * NEAR) / (NEAR - FAR), 0];
    const vp = new Float32Array(16);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { let s = 0; for (let m = 0; m < 4; m++) s += proj[m * 4 + k] * view[i * 4 + m]; vp[i * 4 + k] = s; }
    const glow = [0.12 * Math.sin((TAU * t) / T), 0.1, 1], gll = Math.hypot(...glow);

    gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
    gl.viewport(0, 0, SW, SH);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const use = (pr) => {
      gl.useProgram(pr.p);
      const u = pr.u;
      gl.uniformMatrix4fv(u.uVP, false, vp);
      gl.uniform1f(u.uCamZ, c.z);
      gl.uniform3f(u.uCamPos, ...e);
      gl.uniform1f(u.uFogDist, fogDist);
      gl.uniform3f(u.uCanvas, ...CANVAS);
      gl.uniform3f(u.uGlowDir, glow[0] / gll, glow[1] / gll, glow[2] / gll);
      gl.uniform3f(u.uInk, ...INK); gl.uniform3f(u.uBlue, ...BLUE); gl.uniform3f(u.uGreen, ...GREEN); gl.uniform3f(u.uSpark, ...SPARK);
      gl.uniform1f(u.uTime, t);
      gl.uniform1f(u.uLP, LP);
      gl.uniform4f(u.uAt, ...atlas.at); gl.uniform4f(u.uAt2, ...atlas.at2);
      gl.uniform3f(u.uCR, ...R); gl.uniform3f(u.uCU, ...U); gl.uniform3f(u.uCF, ...f);
      gl.uniform2f(u.uTan, Math.tan(FOV / 2) * asp, Math.tan(FOV / 2));
    };

    use(skyP);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    use(slabP);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas.tex);
    gl.uniform1i(slabP.u.uAtlas, 0);
    gl.bindVertexArray(slabVao);
    gl.drawElementsInstanced(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0, N);

    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    use(planP);
    gl.uniform1f(planP.u.uPlan, planAlpha);
    gl.bindVertexArray(planVao);
    gl.drawElementsInstanced(gl.LINES, 24, gl.UNSIGNED_SHORT, 0, N);

    use(agentP);
    gl.bindVertexArray(agentVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, N);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resFbo);
    gl.blitFramebuffer(0, 0, SW, SH, 0, 0, SW, SH, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(0, 0, W, H);
    gl.useProgram(compP.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, resTex);
    gl.uniform1i(compP.u.uSrc, 0);
    gl.uniform2f(compP.u.uRes, W, H);
    gl.uniform1f(compP.u.uFrame, frame++);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
  return { gl, render };
}
