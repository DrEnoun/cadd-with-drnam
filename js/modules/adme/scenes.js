// 3D scenes for the ADME module: the journey of a tablet through the body (stomach and gut, blood, liver, kidneys) and a molecule inspector.
import { THREE, glow, labelSprite, ligandGroup, createViewer, alignPCA } from '../../viewer3d.js';

const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: .05, ...o });
function lumpy(geo, amp = .06, seed = 1) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 1.7 + seed) * Math.cos(v.y * 1.9 + seed * 2) * Math.sin(v.z * 1.5 + seed * 3); p.setXYZ(i, v.x * (1 + amp * n), v.y * (1 + amp * n), v.z * (1 + amp * n)); }
  geo.computeVertexNormals(); return geo;
}
export const STAGE_COLORS = { A: 0xffb15a, D: 0xff5a6e, M: 0xc0663a, E: 0xffe14a };
export const STAGE_CSS = { A: '#ffb15a', D: '#ff5a6e', M: '#e08a5a', E: '#ffe14a' };

/** The journey: path of the tablet, organs with glowing outlines, red blood cells and a travelling tablet. */
export function journeyScene(v, { onStage } = {}) {
  const root = new THREE.Group(); v.root.add(root);
  const organs = {};
  // --- path of the tablet (A: stomach and gut, D: blood, M: liver, E: kidney and urine)
  const path = new THREE.CatmullRomCurve3([
    V3(-19, 6), V3(-15, 6), V3(-11, 7), V3(-9, 4.5), V3(-7, 7.5), V3(-5, 4.5), V3(-3, 7.5), V3(-1, 5.5), V3(1.5, 8.5), V3(5, 11), V3(9, 9), V3(10, 3.5), V3(9, -1.5), V3(9.5, -5), V3(13, -5.5), V3(16, -3.5), V3(17, -9), V3(17, -14)
  ], false, 'catmullrom', .35);
  const RANGES = { A: [0, .36], D: [.36, .6], M: [.6, .78], E: [.78, 1] };

  // stomach
  const stomach = new THREE.Mesh(lumpy(new THREE.SphereGeometry(1, 40, 28), .08, 2), mat(0xe58f9a, { roughness: .45 })); stomach.scale.set(4.2, 3.1, 2.6); stomach.rotation.z = -.4; stomach.position.set(-16.5, 5.6, 0);
  // small intestine (a coil) + villi hint
  const coil = new THREE.CatmullRomCurve3([V3(-12, 7), V3(-10, 3.5), V3(-8, 7), V3(-6, 3.5), V3(-4, 7), V3(-2, 3.5), V3(0, 6)]);
  const gut = new THREE.Mesh(new THREE.TubeGeometry(coil, 160, 1.15, 20, false), mat(0xf2a07a, { roughness: .55 }));
  organs.A = [stomach, gut];
  // blood vessel (portal vein and circulation)
  const vessel = new THREE.CatmullRomCurve3([V3(0, 6), V3(2, 9.5), V3(5.5, 12), V3(9.5, 10), V3(11, 4), V3(9.5, -1)]);
  const vein = new THREE.Mesh(new THREE.TubeGeometry(vessel, 120, .95, 16, false), new THREE.MeshStandardMaterial({ color: 0xd2364b, roughness: .25, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  const cells = []; const rbcGeo = new THREE.TorusGeometry(.32, .16, 10, 16); rbcGeo.scale(1, 1, .7);
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(rbcGeo, mat(0xc0182f, { roughness: .35 })); m.userData = { t: Math.random(), off: [Math.random() - .5, Math.random() - .5], sp: .035 + Math.random() * .02 }; cells.push(m); root.add(m); }
  organs.D = [vein];
  // liver (+ gall bladder)
  const liver = new THREE.Mesh(lumpy(new THREE.SphereGeometry(1, 48, 32), .1, 5), mat(0x8e3a2e, { roughness: .35 })); liver.scale.set(6.6, 3.9, 3.2); liver.rotation.z = .25; liver.position.set(9.5, -4.8, 0);
  const gall = new THREE.Mesh(new THREE.SphereGeometry(.95, 20, 16), mat(0x7fa84a, { roughness: .3 })); gall.scale.set(1, 1.5, 1); gall.position.set(11, -8.1, 1.2);
  organs.M = [liver, gall];
  // kidneys + ureters + urine
  const bean = () => { const g = new THREE.SphereGeometry(1, 40, 28), p = g.attributes.position, v2 = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v2.fromBufferAttribute(p, i); const dent = Math.exp(-((v2.x - .95) ** 2) / .12) * Math.exp(-(v2.y ** 2) / .5) * .55; p.setX(i, v2.x - dent); } g.computeVertexNormals(); return g; };
  const k1 = new THREE.Mesh(bean(), mat(0xb6523f, { roughness: .35 })), k2 = new THREE.Mesh(bean(), mat(0xb6523f, { roughness: .35 }));
  [k1, k2].forEach(k => k.scale.set(2.1, 3.3, 1.9)); k1.position.set(16.5, -2.4, 0); k1.rotation.z = .15; k2.position.set(16.5, -10.2, 0); k2.rotation.z = Math.PI - .15; k2.scale.x = -2.1;
  const ureter = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(14.6, -4, 0), V3(13.6, -6.2), V3(14.2, -9), V3(15.2, -12.5), V3(16.5, -15.5)]), 50, .28, 10, false), mat(0xffe14a, { emissive: 0xaa8a00, emissiveIntensity: .35 }));
  organs.E = [k1, k2, ureter];
  for (const g of Object.values(organs)) g.forEach(o => root.add(o));
  // outlines in the stage colour (glowing when selected)
  const halos = {}; const CEN = { A: [-9, 5.5], D: [6, 8], M: [9.5, -5], E: [16, -7] }; const SIZE = { A: 26, D: 22, M: 22, E: 20 };
  for (const k of Object.keys(CEN)) { const h = glow([CEN[k][0], CEN[k][1], -2], STAGE_COLORS[k], SIZE[k], .0); halos[k] = h; root.add(h); }
  // letters and names
  const tag = (k, text, at) => { const s = labelSprite(`${k}  ${text}`, { size: 7.5, color: '#ffffff', bg: 'rgba(6,13,27,.82)' }); s.position.set(...at); root.add(s); return s; };
  const tags = { A: tag('A', 'Absorption', [-12, 11, 3]), D: tag('D', 'Distribution', [5.5, 15.5, 3]), M: tag('M', 'Metabolism', [9.5, -10.6, 4]), E: tag('E', 'Excretion', [21, -8, 4]) };
  // the tablet
  const pill = new THREE.Group();
  const half1 = new THREE.Mesh(new THREE.CapsuleGeometry(.5, .9, 8, 16), mat(0xffffff, { roughness: .25 })), half2 = new THREE.Mesh(new THREE.CapsuleGeometry(.5, .9, 8, 16), mat(0x2e7dff, { roughness: .25 }));
  half1.position.y = .7; half2.position.y = -.7; pill.add(half1, half2); pill.rotation.z = Math.PI / 2;
  const pillGlow = glow([0, 0, 0], 0xd4ff3a, 4.4, .8); const tablet = new THREE.Group(); tablet.add(pill, pillGlow); tablet.renderOrder = 6; root.add(tablet);
  // dissolving molecules shown after the gut and in the blood
  const dots = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd4ff3a })); m.visible = false; dots.push(m); root.add(m); }

  let s = 0, playing = true, speed = .045, focus = null, trail = [];
  const stageOf = u => Object.entries(RANGES).find(([, r]) => u >= r[0] && u < r[1])?.[0] ?? 'E';
  let lastStage = 'A';
  v.onFrame = dt => {
    if (playing) { s += dt * speed; if (s >= 1) s = 0; }
    const u = s, p = path.getPointAt(u), tan = path.getTangentAt(u);
    tablet.position.copy(p); pill.rotation.z = Math.atan2(tan.y, tan.x) + Math.PI / 2 * 0 + Math.PI / 2 * 0; pill.rotation.z = Math.atan2(tan.y, tan.x) - Math.PI / 2 + Math.PI / 2;
    const st = stageOf(u);
    // the tablet dissolves into dots in the gut and the blood
    const dissolved = u > .12; half1.visible = half2.visible = u <= .12; pillGlow.scale.setScalar(u <= .12 ? 4.4 : 3 + 3 * Math.sin(u * 60) * 0 + 5);
    dots.forEach((d, i) => { d.visible = dissolved && u < .96; const a = (i / dots.length) * Math.PI * 2 + u * 20; d.position.set(p.x + Math.cos(a) * (.5 + .25 * (i % 3)), p.y + Math.sin(a) * (.5 + .25 * (i % 3)), (i % 5 - 2) * .25); });
    // red blood cells flowing along the vessel
    cells.forEach(c => { c.userData.t = (c.userData.t + c.userData.sp * dt * 6) % 1; const q = vessel.getPointAt(c.userData.t); c.position.set(q.x + c.userData.off[0] * .9, q.y + c.userData.off[1] * .9, c.userData.off[0] * .5); c.rotation.set(c.userData.t * 9, c.userData.t * 7, 0); });
    // halo pulse for the stage the tablet is in (or the chosen one)
    const active = focus || st;
    for (const k of Object.keys(halos)) { const on = k === active; halos[k].material.opacity = on ? .85 + .15 * Math.sin(performance.now() / 260) : 0; }
    if (st !== lastStage) { lastStage = st; if (!focus) onStage?.(st); }
    v.render();
  };
  return {
    root,
    setStage(k) { focus = k; if (k) { const r = RANGES[k]; s = (r[0] + r[1]) / 2; playing = false; onStage?.(k); } },
    play() { focus = null; playing = true; },
    pause() { playing = false; },
    get playing() { return playing; },
    setSpeed(x) { speed = .045 * x; },
  };
}

/** Rotating ball-and-stick molecule with optional glowing atoms. highlight: [{ atom, color }] */
export function inspector(host, { height = 280 } = {}) {
  const v = createViewer(host, { height, autoRotate: true, dist: 20, pitch: .15, yaw: 0 });
  let cur = null;
  return {
    v,
    show(d, highlight = [], carbon = 0xd4ff3a) {
      if (!v) return; if (cur) v.root.remove(cur);
      const P = alignPCA(d.atoms.map(a => [a[1], a[2], a[3]])), atoms = d.atoms.map((a, i) => ({ el: a[0], p: P[i] }));
      cur = new THREE.Group(); cur.add(ligandGroup(atoms, d.bonds, { carbon, halo: 2 }));
      for (const h of highlight) { const a = atoms[h.atom]; if (a) cur.add(glow(a.p, h.color, 4.6, .95)); }
      v.root.add(cur); v.render();
    },
    dispose() { v?.dispose(); },
  };
}
