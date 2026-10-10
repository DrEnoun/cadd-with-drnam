// A small cartoon-style 3D viewer (three.js): glossy ball-and-stick molecules with dark outlines,
// a cut-away protein with a pocket, residue sticks, boxes and dashed hydrogen bonds. Mouse and touch.
import * as THREE from '../vendor/three/three.module.js';
import { h } from './ui.js';
import { unit } from './modules/docking/geom.js';

export { THREE };
export const COLORS = { C: 0xd4ff3a, N: 0x4d8dff, O: 0xff5a5a, S: 0xffd23a, H: 0xffffff, F: 0x6fe06f, FE: 0xe0752b, CL: 0x6fe06f, rC: 0x5eead4 };
const RADIUS = { C: 0.55, N: 0.52, O: 0.5, S: 0.7, F: 0.45, H: 0.35 };
const V = a => new THREE.Vector3(a[0], a[1], a[2]);

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// ---------------------------------------------------------------- viewer
export function createViewer(host, { height = 420, autoRotate = false, dist = 56, yaw = 0.3, pitch = 0.2 } = {}) {
  if (!webglOk()) return null;
  const wrap = h('div', { class: 'view3d', style: `height:${height}px` });
  host.append(wrap);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  wrap.append(renderer.domElement);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '3D molecular view. Drag to rotate.');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
  const root = new THREE.Group(); scene.add(root);
  scene.add(new THREE.HemisphereLight(0xdff7ff, 0x16324a, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(20, 30, 40); scene.add(key);
  const rim = new THREE.DirectionalLight(0x7be0d0, .6); rim.position.set(-30, -10, -20); scene.add(rim);

  const st = { yaw, pitch, dist, target: new THREE.Vector3(), dirty: true, alive: true, mode: 'view', autoRotate };
  const api = { THREE, scene, root, camera, canvas: renderer.domElement, wrap, state: st, onDrag: null, onFrame: null };
  const place = () => {
    const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    camera.position.set(st.target.x + st.dist * cp * Math.sin(st.yaw), st.target.y + st.dist * sp, st.target.z + st.dist * cp * Math.cos(st.yaw));
    camera.up.set(0, 1, 0); camera.lookAt(st.target); st.dirty = true;
  };
  const resize = () => { const w = wrap.clientWidth || 600, hh = wrap.clientHeight || height; renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); st.dirty = true; };
  const ro = new ResizeObserver(resize); ro.observe(wrap); resize(); place();

  // pointer: drag (1 finger / mouse) and pinch (2 fingers)
  const ptr = new Map(); let pinch = 0;
  const c = renderer.domElement; c.style.touchAction = 'none';
  c.addEventListener('pointerdown', e => { e.preventDefault(); c.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } wrap.classList.add('is-drag'); });
  c.addEventListener('pointermove', e => {
    const p = ptr.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) { st.dist = Math.max(14, Math.min(90, st.dist * pinch / d)); place(); } pinch = d; return; }
    if (st.mode === 'view' || !api.onDrag) { st.yaw -= dx * 0.008; st.pitch = Math.max(-1.4, Math.min(1.4, st.pitch + dy * 0.008)); place(); }
    else {
      // basis vectors of the screen in world space, and Å per pixel at the target distance
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const perPx = 2 * st.dist * Math.tan(camera.fov * Math.PI / 360) / (wrap.clientHeight || height);
      api.onDrag(st.mode, dx, dy, { right: [right.x, right.y, right.z], up: [up.x, up.y, up.z], perPx });
      st.dirty = true;
    }
  });
  const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = 0; if (!ptr.size) wrap.classList.remove('is-drag'); };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  c.addEventListener('wheel', e => { e.preventDefault(); st.dist = Math.max(14, Math.min(90, st.dist * (1 + Math.sign(e.deltaY) * 0.08))); place(); }, { passive: false });

  let raf = 0, last = performance.now();
  const loop = now => {
    if (!st.alive) return;
    if (!wrap.isConnected) { api.dispose(); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (st.autoRotate && st.mode === 'view' && !ptr.size) { st.yaw += dt * 0.35; place(); }
    api.onFrame?.(dt);
    if (st.dirty) { renderer.render(scene, camera); st.dirty = false; }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  api.setMode = m => { st.mode = m; };
  api.render = () => { st.dirty = true; };
  api.view = (o = {}) => { Object.assign(st, o); place(); };
  api.dispose = () => { st.alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); wrap.remove(); };
  return api;
}

/** Row of buttons that choose what a drag does: rotate view / move ligand / turn ligand. */
export function modeBar(viewer, modes) {
  const bar = h('div', { class: 'row', role: 'group', 'aria-label': 'What dragging does' }, h('span', { class: 'muted' }, 'Drag to:'));
  modes.forEach(([k, label], i) => bar.append(h('button', { class: 'sticker', type: 'button', 'aria-pressed': String(i === 0), onclick: () => { viewer?.setMode(k); bar.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i))); } }, label)));
  return bar;
}

// ---------------------------------------------------------------- cartoon parts
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x0b1220, side: THREE.BackSide });
const sphereGeo = new THREE.SphereGeometry(1, 28, 20), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 14, 1);
function glossy(color, opacity = 1) { return new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .05, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }); }
function ball(color, r, opacity = 1, outline = true) {
  const m = new THREE.Mesh(sphereGeo, glossy(color, opacity)); m.scale.setScalar(r);
  if (outline && opacity >= .9) { const o = new THREE.Mesh(sphereGeo, outlineMat); o.scale.setScalar(1.16); m.add(o); }
  return m;
}
function stick(a, b, r, color, opacity = 1, outline = true) {
  const m = new THREE.Mesh(cylGeo, glossy(color, opacity)); setStick(m, a, b, r);
  if (outline && opacity >= .9) { const o = new THREE.Mesh(cylGeo, outlineMat); o.scale.set(1.35, 1, 1.35); m.add(o); }
  return m;
}
const Y = new THREE.Vector3(0, 1, 0);
function setStick(m, a, b, r) {
  const A = V(a), B = V(b), d = B.clone().sub(A), L = d.length() || 1e-3;
  m.position.copy(A).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(Y, d.normalize()); m.scale.set(r, L, r);
}

/** Ball-and-stick ligand. atoms: [{el,p}], bonds: [[i,j]]. Use .setAtoms(newAtoms) to move it. */
export function ligandGroup(atoms, bonds, { carbon = COLORS.C, opacity = 1, outline = true, polarMark = false } = {}) {
  const g = new THREE.Group(); const balls = [], sticks = [];
  atoms.forEach(a => { const m = ball(a.el === 'C' ? carbon : COLORS[a.el] ?? 0xcccccc, RADIUS[a.el] ?? .6, opacity, outline); m.position.copy(V(a.p)); g.add(m); balls.push(m); });
  bonds.forEach(([i, j]) => { const m = stick(atoms[i].p, atoms[j].p, .2, a2(atoms[i], atoms[j], carbon), opacity, outline); g.add(m); sticks.push(m); });
  function a2(a, b, c) { return a.el === 'C' && b.el === 'C' ? c : a.el === 'C' ? COLORS[b.el] : COLORS[a.el]; }
  g.userData.setAtoms = next => { next.forEach((a, i) => balls[i].position.copy(V(a.p))); bonds.forEach(([i, j], k) => setStick(sticks[k], next[i].p, next[j].p, .2)); };
  return g;
}

export function labelSprite(text, { color = '#ffffff', bg = 'rgba(6,13,27,.78)', size = 4.2 } = {}) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72; const x = cv.getContext('2d');
  x.fillStyle = bg; x.beginPath(); x.roundRect(2, 6, 252, 60, 22); x.fill();
  x.font = '700 34px "League Spartan", system-ui, sans-serif'; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 38);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); s.scale.set(size, size * 72 / 256, 1); s.renderOrder = 10;
  return s;
}

/** Dashed line made of small beads (used for hydrogen bonds). */
export function dashed(a, b, color = 0xffd23a, n = 7) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const t = (i + .5) / n; const m = ball(color, .17, 1, false); m.position.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); g.add(m); }
  return g;
}

/** A search box: 12 edges and a translucent body. .set(centre, size, ok) updates it. */
export function boxGroup() {
  const g = new THREE.Group(); const edges = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(cylGeo, new THREE.MeshBasicMaterial({ color: COLORS.C })); g.add(m); return m; });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: COLORS.C, transparent: true, opacity: .13, depthWrite: false })); g.add(body);
  const E = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  g.userData.set = (c, s, ok = true) => {
    const col = ok ? COLORS.C : 0xfc7a7a, hs = s / 2;
    const P = i => [c[0] + (i & 1 ? hs : -hs), c[1] + (i & 2 ? hs : -hs), c[2] + (i & 4 ? hs : -hs)];
    E.forEach(([i, j], k) => { setStick(edges[k], P(i), P(j), .22); edges[k].material.color.setHex(col); });
    body.position.set(...c); body.scale.setScalar(s); body.material.color.setHex(col);
  };
  return g;
}

// ---------------------------------------------------------------- the real protein (a cut-away ribbon with the pocket residues)
function bicolor(g, a, b, ca, cb, r) {
  const m = [a[0] / 2 + b[0] / 2, a[1] / 2 + b[1] / 2, a[2] / 2 + b[2] / 2];
  g.add(stick(a, m, r, ca), stick(m, b, r, cb));
}
const CUT = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 3)]; // hides the front half of the ribbon so the pocket can be seen
function ribbon(ca) {
  const g = new THREE.Group(), segs = []; let cur = [];
  ca.forEach((c, i) => { if (i && Math.hypot(c[0] - ca[i - 1][0], c[1] - ca[i - 1][1], c[2] - ca[i - 1][2]) > 4.6) { segs.push(cur); cur = []; } cur.push(c); });
  segs.push(cur);
  const mat = { 0: 0xcfe3ea, 1: 0x2fb3a8, 2: 0x4d8dff }, rad = { 0: .32, 1: .75, 2: .55 };
  for (const seg of segs) {
    let i = 0;
    while (i < seg.length) {
      let j = i; while (j + 1 < seg.length && seg[j + 1][3] === seg[i][3]) j++;
      const pts = seg.slice(Math.max(0, i - 1), Math.min(seg.length, j + 2)).map(c => new THREE.Vector3(c[0], c[1], c[2]));
      if (pts.length >= 2) {
        const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5) : new THREE.LineCurve3(pts[0], pts[1]);
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(4, pts.length * 4), rad[seg[i][3]], 8, false),
          new THREE.MeshStandardMaterial({ color: mat[seg[i][3]], roughness: .45, metalness: .05, clippingPlanes: CUT, side: THREE.DoubleSide }));
        g.add(m);
      }
      i = j + 1;
    }
  }
  return g;
}
/** The protein scene from data/docking/cox2.json. opts: labels (residue labels to name), highlight (labels to ring), show ('all' | labels). */
export function pocketGroup(st, { labels = [], highlight = [], show = 'all', ribbon: withRibbon = true, heme = true } = {}) {
  const g = new THREE.Group();
  if (withRibbon) g.add(ribbon(st.ca));
  if (heme && st.heme?.atoms.length) { const at = st.heme.atoms; st.heme.bonds.forEach(([i, j]) => bicolor(g, at[i].slice(1), at[j].slice(1), at[i][0] === 'C' ? 0xff9f43 : COLORS[at[i][0]] ?? 0xff9f43, at[j][0] === 'C' ? 0xff9f43 : COLORS[at[j][0]] ?? 0xff9f43, .12)); }
  for (const r of st.pocket) {
    if (show !== 'all' && !show.includes(r.label)) continue;
    const at = r.atoms;
    r.bonds.forEach(([i, j]) => bicolor(g, at[i].slice(1, 4), at[j].slice(1, 4), COLORS[at[i][0]] ?? COLORS.rC, COLORS[at[j][0]] ?? COLORS.rC, .13));
    at.forEach(a => { if (a[0] !== 'C') { const b = ball(COLORS[a[0]] ?? 0xcccccc, .3, 1, false); b.position.set(a[1], a[2], a[3]); g.add(b); } });
    const ctr = at.reduce((s, a) => [s[0] + a[1] / at.length, s[1] + a[2] / at.length, s[2] + a[3] / at.length], [0, 0, 0]);
    if (highlight.includes(r.label)) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, .12, 8, 32), new THREE.MeshBasicMaterial({ color: 0xfc7a7a, depthTest: false, transparent: true })); ring.position.set(...ctr); ring.renderOrder = 9; ring.userData.billboard = true; g.add(ring); }
    if (labels.includes(r.label)) { const l = labelSprite(r.label, { size: 5 }); const o = unit(ctr); l.position.set(ctr[0] + o[0] * 3.2, ctr[1] + o[1] * 3.2 + 1, ctr[2] + o[2] * 3.2); g.add(l); }
  }
  return g;
}
